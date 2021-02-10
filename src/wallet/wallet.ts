import { Model } from 'acey'

import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import secp256k1 from 'tiny-secp256k1'
import { B64ToByteArray, Sha256 } from '../util'
import { ec as EC } from 'elliptic'

let ec = new EC('secp256k1');


class Wallet extends Model {
    static NewMnemonic = (): string => {
        return bip39.generateMnemonic()
    }

    constructor(mnemonic: string, password: string){
        super({ mnemonic })
        this.setState({ 
            seed: bip39.mnemonicToSeedSync(mnemonic, password),
            contract: {
                value: B64ToByteArray("13LnUf4t"),
                next_change: 1613684544
            }
        })
    }

    masterKey = () => bip32.fromSeed(this.state.seed)
    privateKey = () => this.masterKey().privateKey as Buffer
    publicKey = () => this.masterKey().publicKey

    pubKHex = () => this.publicKey().toString('hex')
    // sign = (value: Buffer) => secp256k1.sign(value, this.masterKey().privateKey as Buffer)

    signAuthentificationContract = () => Buffer.from(ec.sign(Sha256(this.authentificationContractValue()), this.masterKey().privateKey as Buffer).toDER()).toString('hex')
    authentificationContractValue = () => this.state.contract.value
}


export default Wallet