import { Model } from 'acey'

import { B64ToByteArray, Sha256 } from '../util'
import { ec as EC } from 'elliptic'

import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant/api'
import { UTXOList } from '../transaction'

import AuthContract from './auth-contract'
import Fees from './fees'
import Costs from './costs'
import Keys from './keys'

const ec = new EC('secp256k1');

class Wallet extends Model {

    constructor(initialState: any, options: any){
        super(initialState, options)
        this.setState({ 
            seed: new Keys(initialState.seed || '', this.kids()),
            utxos: new UTXOList(initialState.utxos || [], this.kids()),
            cch_list: initialState.cch_list || [],
            contract: new AuthContract(initialState.contract, this.kids()),
            fees: new Fees(initialState.fees, this.kids()),
            costs: new Costs(initialState.costs, this.kids())
        })
    }

    refreshAllData = async () => {
        await this.utxos().fetch()
        await this.cch().fetch()
    }

    public keys = (): Keys => this.state.keys
    public auth = (): AuthContract => this.state.contracts
    public fees = (): Fees => this.state.fees
    public costs = (): Costs => this.state.costs


    cch = () => {
        const get = (): Array<string> => this.state.cch_list || [] 
        const last = () => get().length == 0 ? '' : Buffer.from(B64ToByteArray(get()[0]))

        const Fetch = async () => {
            if (this.utxos().get().count() > 0){
                await this.auth().refresh()
                try {
                    const res = await fetch(ROOT_API_URL + '/cch', {
                        method: 'GET',
                        headers: Object.assign({}, this.sign().header(), {last_cch: last().toString('hex') })
                    })
                    if (res.status == 200){
                        let list = await res.json() || []
                        this.setState({ cch_list: get().concat( list.filter((elem: any) => elem != null)) }).store()
                    }
                    return res.status
                } catch (e){
                    throw new Error(e)
                }
            }
        }

        return { get, fetch: Fetch, last }
    }

    utxos = () => {
        const get = (): UTXOList => this.state.utxos
        const Fetch = async () => {
            await this.auth().refresh()
            try {
                const res = await fetch(ROOT_API_URL + '/utxos', {
                    method: 'GET',
                    headers: this.sign().header()
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

    sign = () => {
        const value = (val:Buffer) => ec.sign(val, this.keys().get().priv()).toDER()
        return {
            value,
            header: () => {
                return {
                    pubkey: this.keys().get().pubHex() as string,
                    signature: Buffer.from(value(Sha256(B64ToByteArray(this.state.contract.value)))).toString('hex')
                }
            }
        }
    }

}


export default Wallet