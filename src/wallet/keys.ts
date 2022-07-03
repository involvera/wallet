import { Model } from 'acey'
import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { Buffer } from 'buffer'
import { GetAddressFromPubKeyHash, ToPubKeyHash, Ripemd160, Sha256 } from 'wallet-util'
import aes from 'aes-js'
import { AliasModel, IAlias } from '../off-chain'

export interface IKey {
    pass_hash: string
    mnemonic: string
    alias: IAlias
}

const DEFAULT_STATE = {
    pass_hash: '',
    mnemonic: '',
    alias: AliasModel.DefaultState
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
        this.setPassword(pass)

        var mnemoBytes = aes.utils.utf8.toBytes(mnemonic)
        var aesCtr = new aes.ModeOfOperation.ctr(this.get256BitsPassword())

        const mnemonicEncrypted = aesCtr.encrypt(mnemoBytes);
        var encryptedHex = aes.utils.hex.fromBytes(mnemonicEncrypted);
        this.setState({ 
            pass_hash: this._hashPass(pass),
            mnemonic: encryptedHex,
        })
        this.get().alias().setState({address: this.get().address()})
        return this.action()   
    }

    isPasswordSet = () => !!this.getPassword()
    isSet = () => this.state.mnemonic.length > 0

    fetch = () => {
        const alias = async () => {
            const alias = await AliasModel.fetch(this.get().address())
            if (alias){
                this.setState({ alias: new AliasModel(alias.to().plain(), this.kids()) }).save().store()
            }
        }

        const aliasIfNotSet = async () => {
            if (this.get().alias() == null || this.get().alias().get().username() == ''){
                await alias()
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

            var encryptedBytes = aes.utils.hex.toBytes(mnemonic);
            var aesCtr = new aes.ModeOfOperation.ctr(this.get256BitsPassword());
            var decryptedBytes = aesCtr.decrypt(encryptedBytes);
            return aes.utils.utf8.fromBytes(decryptedBytes);
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