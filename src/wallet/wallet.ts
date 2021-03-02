import { Model } from 'acey'

import { B64ToByteArray, Sha256 } from '../util'
import { ec as EC } from 'elliptic'
import TxBuild from './tx-builder' 

import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant/api'
import { Transaction, UTXOList } from '../transaction'

import AuthContract from './auth-contract'
import Fees from './fees'
import Costs from './costs'
import Keys from './keys'
import { EMPTY_CODE } from '../script/constant'

const ec = new EC('secp256k1');

export interface IHeaderSignature {
    pubkey: string
    signature: string
}

export default class Wallet extends Model {

    constructor(initialState: any, options: any){
        super(initialState, options)
        this.setState({ 
            seed: new Keys(initialState.seed || {seed: ''}, this.kids()),
            utxos: new UTXOList(initialState.utxos || [], this.kids()),
            cch: initialState.cch || {list: [], last_height: 0},
            contract: new AuthContract(initialState.contract, this.kids()),
            fees: new Fees(initialState.fees, this.kids()),
            costs: new Costs(initialState.costs, this.kids())
        })
    }

    fetchAllWalletData = async () => {
        await this.utxos().fetch()
        await this.cch().fetch()
        await this.fees().fetch()
        await this.costs().fetch()
    }

    public keys = (): Keys => this.state.seed
    public auth = (): AuthContract => this.state.contract
    public fees = (): Fees => this.state.fees
    public costs = (): Costs => this.state.costs

    buildTX = () => {

        const fetchFees = async () => {
            try {
                const status = await this.fees().fetch()
                if (status != 200)
                    throw new Error("Can't fetch transaction fees.")
                
            } catch (e){
                throw new Error(e)
            }
        }  

        const toPKH = async (pubKH: string, amount: number): Promise<Transaction | null> => {
            await fetchFees()

            const to: string[] = []
            const ta: Buffer[][] = []
            const emptyTa: Buffer[] = []
            to.push(pubKH)
            ta.push(emptyTa)

            const builder = new TxBuild({ 
                wallet: this,
                to,
                amount_required: [amount],
                ta,
                kinds: Buffer.from([EMPTY_CODE])
            })
            return await builder.newTx()
        }

        return { toPKH }
    }


    cch = () => {

        const get = () => {
            const list = (): string[] => this.state.cch.list 
            const last = () => list().length == 0 ? '' : list()[0]
            const lastHeight = (): number => this.state.cch.last_height
            
            return { list, last, lastHeight }
        }

        const Fetch = async () => {
            if (this.utxos().get().count() > 0){
                await this.auth().refresh()
                try {
                    const res = await fetch(ROOT_API_URL + '/cch', {
                        method: 'GET',
                        headers: Object.assign({}, this.sign().header() as any, {last_cch: get().last() })
                    })
                    if (res.status == 200){
                        let { list, last_height} = await res.json()
                        list = list || []
                        this.setState({ cch: { list: get().list().concat(list.filter((elem: any) => elem != null)), last_height } } ).store()
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
                    headers: this.sign().header() as any
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
            header: (): IHeaderSignature => {
                return {
                    pubkey: this.keys().get().pubHex() as string,
                    signature: Buffer.from(value(Sha256(B64ToByteArray(this.auth().get().value())))).toString('hex')
                }
            }
        }
    }

}

