import { Collection, Model } from 'acey'
import config from '../config'
import { ONCHAIN} from 'community-coin-types'
import { UTXOCollection, UTXOModel } from './utxo'
import axios from 'axios'
import { TransactionModel } from './transaction'
import { Script } from 'wallet-script'
import { Inv } from 'wallet-util'


const DEFAULT_STATE: ONCHAIN.IInputUnRaw = {
	prev_transaction_hash: '',
	vout: -1,
	script_sig: []
}

export class InputModel extends Model {

    static DefaultState: ONCHAIN.IInputUnRaw = DEFAULT_STATE

    constructor(input: ONCHAIN.IInputUnRaw, options: any) {
        super(input, options)
    }

    size = (): number => {
        const raw = this.toRaw().default()
        let size = raw.prev_transaction_hash.length
        size += Script.new(raw.script_sig).fullSizeOctet()
        size += raw.vout.length
        return size
    }

    get = () => {
        const prevTxHash = (): Inv.TxHash | null => this.state.prev_transaction_hash ? Inv.TxHash.fromHex(this.state.prev_transaction_hash) : null
        const vout = (): number => typeof this.state.vout === 'number' ? this.state.vout : -1
        const script = () => Script.new(this.state.script_sig, 'base64')
        return { vout, prevTxHash, script }
    }

    bytes = () => {
        const r = this.toRaw().default()
        return Inv.InvBuffer.FromUint8s(r.prev_transaction_hash, r.vout, ...r.script_sig)
    }

    toRaw = () => {
        const def = ():  ONCHAIN.IInputRaw => {
            return {
                prev_transaction_hash: this.get().prevTxHash()?.bytes() || new Uint8Array(),
                vout: new Inv.InvBigInt(this.get().vout()).bytes('int16').bytes(),
                script_sig: this.get().script().bytes()
            }
        }

        const base64 = () => {
            return {
                prev_transaction_hash: this.get().prevTxHash()?.base64() || "",
                vout: new Inv.InvBigInt(this.get().vout()).base64('int16'),
                script_sig: this.get().script().base64()
            }
        }
        
        return { default: def, base64 }
    }

}

export class InputCollection extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [InputModel, InputCollection], options)
    }

    bytes = () => Inv.InvBuffer.FromUint8s(...this.map((inp: InputModel) => inp.bytes().bytes()))

    size = (): number => this.reduce((accumulator: number, inp: InputModel) => accumulator + inp.size(), 0) + this.count()

    prevTxIDndVoutList = (): {tx_id: string, vout: number}[] => {
        return this.map((i: InputModel) => {
            return {
                tx_id: i.get().prevTxHash()?.hex(),
                vout: i.get().vout()
            }
        })
    }

    fetchPrevTxList = async (headerSignature: ONCHAIN.IHeaderSignature, userTxList: UTXOCollection) => {
        const utxos: UTXOModel[] = []
        for (let {tx_id, vout} of this.prevTxIDndVoutList()){
            const u = userTxList.get().UTXOByTxHashAndVout(tx_id, vout)
            if (u && !u.get().tx()){
                utxos.push(u)
            }
        }
        if (utxos.length == 0)
            return 0
        try { 
                const listTxIDs = utxos.map((u) => u.get().txID().hex())
                const response = await axios(config.getRootAPIChainUrl() + '/transactions/list', {
                    headers: Object.assign({}, headerSignature as any, {list: listTxIDs.join(',') }),
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                if (response.status == 200){
                    let list = response.data
                    list = list || []
                    utxos.forEach((utxo, i) => {
                        utxo.setState({ tx: new TransactionModel(list[i], this.kids()) })
                    })
                    return list.length
                }
            return 0
        } catch (e: any){
            throw new Error(e)
        }
    }
}