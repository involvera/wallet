import { Model } from 'acey'
import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { GetAddressFromPubKeyHash, ToPubKeyHash, Sha256 } from 'wallet-util'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import { Alias, IAlias, DEFAULT_STATE as AliasDefaultState } from '../off-chain'

export interface IKey {
    seed: string
    mnemonic: string
    alias: IAlias
}

const DEFAULT_STATE = {
    seed: '',
    mnemonic: '',
    alias: AliasDefaultState
}

export default class Keys extends Model {

    constructor(initialState: IKey = DEFAULT_STATE, options: any){
        super(Object.assign(initialState, {}, 
            ), options)
    }
    
    set = (mnemonic: string, pass: string) => {
        const pair = nacl.box.keyPair.fromSecretKey(Sha256(pass))
        const nonce = new Uint8Array(nacl.box.nonceLength)
        const mnemonicEncrypted = nacl.secretbox(Buffer.from(mnemonic), nonce, pair.secretKey)

        this.setState({ 
            seed: bip39.mnemonicToSeedSync(mnemonic, pass).toString('hex'), 
            mnemonic: Buffer.from(mnemonicEncrypted).toString('hex'),
        })
        return this.setState({
            alias: new Alias(undefined, this.kids())
        })
    }

    isSet = () => this.state.seed.length > 0

    fetch = () => {
        const aliasIfNotSet = async () => {
            if (this.get().alias() == null){
                await alias()
            }
        }

        const alias = async () => {
            const alias = await Alias.fetch(this.get().address())
            if (alias){
                this.setState({ alias: new Alias(alias.to().plain(), this.kids()) }).save().store()
            }
        }
        return {
            alias,
            aliasIfNotSet
        }
    }

    get = () => {
        const alias = (): Alias => this.state.alias 
        const seed = () => Buffer.from(this.state.seed, 'hex')
        const master = () => bip32.fromSeed(seed())
        const wallet = () => master()?.derivePath('m/0/0')
        const priv = () => wallet().privateKey as Buffer
        const pub = () =>  wallet().publicKey as Buffer
        const pubHex = () => pub().toString('hex')
        const pubHash = () => ToPubKeyHash(pub())
        const pubHashHex = () => pubHash().toString('hex')
        const address = () => GetAddressFromPubKeyHash(pubHash())

        const mnemonic = (pass: string) => {
            const { mnemonic } = this.state
            const pair = nacl.box.keyPair.fromSecretKey(Sha256(pass))
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
            seed, master, wallet, priv, pub, 
            pubHex, pubHash, pubHashHex,
            derivedPub, address, 
            derivedPubHash, mnemonic,
            contentWallet, alias
        }
    }
}