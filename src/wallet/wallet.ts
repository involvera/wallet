import { Model } from 'acey'

import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { B64ToByteArray, Sha256 } from '../util'
import { ec as EC } from 'elliptic'

import fetch, { Response } from 'node-fetch'
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
        if (!this.seed().isSet()){
            throw new Error("You need to set a seed to the wallet in order to perform this action.")
        }
    }

    refreshAllData = async () => {
        await this.utxos().fetch()
        await this.cch().fetch()
    }

    public seed = () => {
        const get = () => Buffer.from(this.state.seed, 'hex')
        const set = (mnemonic: string, pass: string) => this.setState({ seed: bip39.mnemonicToSeedSync(mnemonic, pass).toString('hex') }).store()
        const isSet = () => this.state.seed.length > 0
        
        return { get, set, isSet }
    }

    public key = () => {
        this._throwErrorIsSeedNotSet() 
        const master = () => bip32.fromSeed(this.seed().get())
        const priv = () => master()?.privateKey as Buffer
        const pub = () => master().publicKey as Buffer
        const pubHex = () => pub().toString('hex')

        return { master, priv, pub, pubHex }
    }

    public auth = () => {
        const get = (): IAuthContract | null => this.state.contract || null
        const isExpired = () => {
            const contract = get()
            return !contract ? true : !(new Date(contract.next_change * 1000) > new Date())
        }
        const Fetch = async () => {
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
        const refresh = async () => isExpired() && await Fetch()
        const reset = () => this.setState({ contract: {value: "", next_change: 0} })

        return { get, isExpired, refresh, fetch: Fetch, reset }
    }

    cch = () => {
        const get = (): Array<any> => this.state.cch_list || [] 
        const Fetch = async () => {
            if (this.utxos().get().count() > 0){
                await this.auth().refresh()
                try {
                    const res = await fetch(ROOT_API_URL + '/cch', {
                        method: 'GET',
                        headers: this.signHeader()
                    })
                    if (res.status == 200){
                        const list = await res.json()
                        this.setState({ cch_list: get().concat(list || []) }).store()
                    }
                    return res.status
                } catch (e){
                    throw new Error(e)
                }
            }
        }

        return { get, fetch: Fetch }
    }

    utxos = () => {
        const get = (): UTXOList => this.state.utxos
        const Fetch = async () => {
            await this.auth().refresh()
            try {
                const res = await fetch(ROOT_API_URL + '/utxos', {
                    method: 'GET',
                    headers: this.signHeader()
                })
                if (res.status == 200){
                    const json = await res.json()
                    get().setState(json.utxos || []).store()
                }
                return res.status
            } catch (e){
                throw new Error(e)
            }
        }
        return { get, fetch: Fetch }
    }

    signHeader = () => {
        return {
            pubkey: this.key().pubHex() as string,
            signature: Buffer.from(this.signValue(Sha256(B64ToByteArray(this.state.contract.value)))).toString('hex')
        }
    }
    signValue = (value: Buffer) => ec.sign(value, this.key().priv()).toDER()
}


export default Wallet