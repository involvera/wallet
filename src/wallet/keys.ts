import { Model } from 'acey'

import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { ToPubKeyHash } from '../util/wallet'

export default class Keys extends Model {

    constructor(initialState = {seed: ''}, options: any){
        super(initialState, options)
    }

    private _throwErrorIsSeedNotSet = () => {
        if (!this.isSet()){
            throw new Error("You need to set a seed to your wallet's keys in order to perform this action.")
        }
    }
    
    set = (mnemonic: string, pass: string) => {
        return this.setState({ seed: bip39.mnemonicToSeedSync(mnemonic, pass).toString('hex') })
    }

    isSet = () => this.state.seed.length > 0

    get = () => {
        this._throwErrorIsSeedNotSet() 
        const seed = () => Buffer.from(this.state.seed, 'hex')
        const master = () => bip32.fromSeed(seed())
        const priv = () => master()?.privateKey as Buffer
        const pub = () => master().publicKey as Buffer
        const pubHex = () => pub().toString('hex')
        const pubHash = () => ToPubKeyHash(pub())
        const pubHashHex = () => pubHash().toString('hex')

        return { 
            seed, master, priv, pub, 
            pubHex, pubHash, pubHashHex 
        }
    }
}