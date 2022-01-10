import { Model } from 'acey'
import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { GetAddressFromPubKeyHash, ToPubKeyHash, Ripemd160, Sha256 } from 'wallet-util'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import { AliasModel, IAlias, ALIAS_DEFAULT_STATE } from '../off-chain'

export interface IKey {
    pass_hash: string
    mnemonic: string
    alias: IAlias
}

const DEFAULT_STATE = {
    pass_hash: '',
    mnemonic: '',
    alias: ALIAS_DEFAULT_STATE
}

export default class KeysModel extends Model {

    static DefaultState: IKey = DEFAULT_STATE
    
    private _password: string = ''

    constructor(initialState: IKey = DEFAULT_STATE, options: any){
        super(initialState, options)
        this.setState({
            alias: new AliasModel(initialState.alias, this.kids())
        })
    }

    _hashPass = (pass: string) => Sha256(Ripemd160(pass)).toString('hex')

    _triggerPasswordError = () => {
        if (this.getPassword() == ''){
            throw new Error("Password is not set")
        }
        if (this._hashPass(this.getPassword()) !== this.get().passHash()){
            throw new Error("Wrong password")
        }
    }

    setPassword = (pass: string) => {
        this._password = pass
        return this.action()
    }

    getPassword = () => this._password
    get256BitsPassword = () => Sha256(this.getPassword())

    set = (mnemonic: string, pass: string) => {
        const pair = nacl.box.keyPair.fromSecretKey(Sha256(pass))
        const nonce = new Uint8Array(nacl.box.nonceLength)
        const mnemonicEncrypted = nacl.secretbox(Buffer.from(mnemonic), nonce, pair.secretKey)

        this.setPassword(pass)
        this.setState({ 
            pass_hash: this._hashPass(pass),
            mnemonic: Buffer.from(mnemonicEncrypted).toString('hex'),
        })
        return this.setState({
            alias: new AliasModel(Object.assign(ALIAS_DEFAULT_STATE, {address: this.get().address()}) , this.kids())
        })
    }

    isPasswordSet = () => !!this.getPassword()
    isSet = () => this.state.mnemonic.length > 0

    fetch = () => {
        const aliasIfNotSet = async () => {
            if (this.get().alias() == null){
                await alias()
            }
        }

        const alias = async () => {
            const alias = await AliasModel.fetch(this.get().address())
            if (alias){
                this.setState({ alias: new AliasModel(alias.to().plain(), this.kids()) }).save().store()
            }
        }
        return {
            alias,
            aliasIfNotSet
        }
    }

    get = () => {
        const passHash = (): string => this.state.pass_hash
        const alias = (): AliasModel => this.state.alias 
        const seed = () => bip39.mnemonicToSeedSync(mnemonic(), this.getPassword())
        const master = () => bip32.fromSeed(seed())
        const wallet = () => master()?.derivePath('m/0/0')
        const priv = () => wallet().privateKey as Buffer
        const pub = () =>  wallet().publicKey as Buffer
        const pubHex = () => pub().toString('hex')
        const pubHash = () => ToPubKeyHash(pub())
        const pubHashHex = () => pubHash().toString('hex')
        const address = () => GetAddressFromPubKeyHash(pubHash())

        const mnemonic = () => {
            this._triggerPasswordError()
            const { mnemonic } = this.state

            const pair = nacl.box.keyPair.fromSecretKey(this.get256BitsPassword())
            const nonce = new Uint8Array(nacl.box.nonceLength)
            const msg2 = nacl.secretbox.open(new Uint8Array(Buffer.from(mnemonic, 'hex')), nonce, pair.secretKey)

            return naclUtil.encodeUTF8(msg2 as Uint8Array)
        } 

        const derivedPubHash = (index: number): Buffer => ToPubKeyHash(derivedPub(index))

        const contentWallet = (nonce: number): bip32.BIP32Interface => {
            return master().derivePath('m/1/' + nonce.toString())
        }

        const derivedPub = (index: number): Buffer => {
            const m = master().derivePath('m/1/' + index.toString())
            return m.publicKey
        }

        return {
            passHash,
            seed, master, wallet, priv, pub, 
            pubHex, pubHash, pubHashHex,
            derivedPub, address, 
            derivedPubHash, mnemonic,
            contentWallet, alias,
        }
    }
}