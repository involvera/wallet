import { Model } from 'acey'

import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { B64ToByteArray, Sha256 } from '../util'
import { ec as EC } from 'elliptic'

import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant/api'
import { UTXOList } from '../transaction'

let ec = new EC('secp256k1');

interface IAuthContract {
    value: Uint8Array,
    next_change: number
}

class Wallet extends Model {
    static NewMnemonic = (): string => {
        return bip39.generateMnemonic()
    }

    constructor(initialState: any, options: any){
        super(initialState, options)
        this.setState({ 
            seed: initialState.seed || '',
            utxos: new UTXOList(initialState.utxos || [], this.kids()),
            cch_list: initialState.cch_list || [],
            contract: initialState.contract || {value: "", next_change: 0}
        })
    }

    private _throwErrorIsSeedNotSet = () => {
        if (!this.isSeedSet()){
            throw new Error("You need to set a seed to the wallet in order to perform this action.")
        }
    }

    setSeed = (mnemonic: string, pass: string) => {
        this.setState({ seed: bip39.mnemonicToSeedSync(mnemonic, pass).toString('hex') }).store()
    }

    isSeedSet = () => this.state.seed.length > 0

    fetchAuthContract = async () => {
        try {
            const res = await fetch(ROOT_API_URL + '/contract', { method: 'GET' })
            if (res.status == 200) {
                this.setState({ contract: await res.json() }).store()
            }
            return res.status
        } catch(e){
            throw new Error(e);
        }
    }

    fetchCCHList = async () => {
        if (this.getUTXOS().count() > 0){
            await this.refreshAuthContract()
            try {
                const res = await fetch(ROOT_API_URL + '/cch', {
                    method: 'GET',
                    headers: {
                        pubkey: this.pubKHex() as string,
                        signature: this.signAuthentificationContract()
                    }
                })
                if (res.status == 200){
                    const list = await res.json()
                    this.setState({ cch_list: this.getCCHList().concat(list || []) }).store()
                }
                return res.status
            } catch (e){
                throw new Error(e)
            }
        }
    }

    fetchUTXOList = async () => {
        await this.refreshAuthContract()
        try {
            const res = await fetch(ROOT_API_URL + '/utxos', {
                method: 'GET',
                headers: {
                    pubkey: this.pubKHex() as string,
                    signature: this.signAuthentificationContract()
                }
            })
            if (res.status == 200){
                const json = await res.json()
                this.getUTXOS().setState(json.utxos || []).store()
            }
            return res.status
        } catch (e){
            throw new Error(e)
        }
    }

    refreshAuthContract = async () => {
        if (this.isAuthContractExpired()){
            await this.fetchAuthContract()
        }
    }

    isAuthContractExpired = () => {
        const contract = this.getAuthContract()
        return !contract ? true : !(new Date(contract.next_change * 1000) > new Date())
    }

    getAuthContract = (): IAuthContract | null => this.state.contract || null
    getCCHList = (): Array<any> => this.state.cch_list || [] 
    getUTXOS = (): UTXOList => this.state.utxos

    masterKey = (): bip32.BIP32Interface  => {
        this._throwErrorIsSeedNotSet() 
        return bip32.fromSeed(this.seed())
    }

    seed = () => Buffer.from(this.state.seed, 'hex')

    privateKey = () => {
        this._throwErrorIsSeedNotSet()
        return this.masterKey()?.privateKey as Buffer
    }

    publicKey = () => {
        this._throwErrorIsSeedNotSet()
        return this.masterKey()?.publicKey as Buffer
    }

    pubKHex = () => this.publicKey().toString('hex')
    sign = (value: Buffer) => ec.sign(value, this.masterKey().privateKey as Buffer).toDER()

    signAuthentificationContract = () => Buffer.from(this.sign(this.authentificationContractValue())).toString('hex')
    authentificationContractValue = () => Sha256(B64ToByteArray(this.state.contract.value))
}


export default Wallet