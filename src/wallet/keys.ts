import { Model } from 'acey'

import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { GetAddressFromPubKeyHash, ToPubKeyHash, Sha256 } from 'wallet-util'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'


export default class Keys extends Model {

    constructor(initialState = {seed: '', mnemonic: ''}, options: any){
        super(initialState, options)
    }
    
    set = (mnemonic: string, pass: string) => {
        const pair = nacl.box.keyPair.fromSecretKey(Sha256(pass))
        const nonce = new Uint8Array(nacl.box.nonceLength)
        const mnemonicEncrypted = nacl.secretbox(Buffer.from(mnemonic), nonce, pair.secretKey)

        return this.setState({ 
            seed: bip39.mnemonicToSeedSync(mnemonic, pass).toString('hex'), 
            mnemonic: Buffer.from(mnemonicEncrypted).toString('hex')
        })
    }

    isSet = () => this.state.seed.length > 0

    get = () => {
        const seed = () => Buffer.from(this.state.seed, 'hex')
        const master = () => bip32.fromSeed(seed())
        const priv = () => master()?.derivePath('m/0/0').privateKey as Buffer
        const pub = () =>  master()?.derivePath('m/0/0').publicKey as Buffer
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

        const derivedPub = (index: number): Buffer => {
            const m = master().derivePath('m/1/' + index.toString())
            return m.publicKey
        }

        const derivedPrivate = (index: number): Buffer => {
            const m = master().derivePath('m/1/' + index.toString())
            return m.privateKey as Buffer
        }


        return {
            seed, master, priv, pub, 
            pubHex, pubHash, pubHashHex,
            derivedPrivate, derivedPub,
            address, derivedPubHash, mnemonic
        }
    }
}