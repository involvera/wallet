import { Collection, Model } from 'acey'
import config from '../config'
import { IInputRaw, IInputUnRaw } from 'community-coin-types'
import { IHeaderSignature } from '../wallet'
import { UTXOCollection, UTXOModel } from './utxo'
import axios from 'axios'
import { TransactionModel } from './transaction'
import { Script } from 'wallet-script'
import { Inv } from 'wallet-util'
import { InvBigInt } from 'wallet-util/dist/src/involvera-types'

const DEFAULT_STATE: IInputUnRaw = {
	prev_transaction_hash: '',
	vout: -2,
	script_sig: []
}

export class InputModel extends Model {

    static DefaultState: IInputUnRaw = DEFAULT_STATE

    constructor(input: IInputUnRaw, options: any) {
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
        const prevTxHash = (): Inv.TxHash | null => this.state.prev_transaction_hash ? new Inv.TxHash(this.state.prev_transaction_hash) : null
        const vout = (): Inv.InvBigInt => new InvBigInt(typeof this.state.vout === 'number' ? this.state.vout : -1)
        const script = () => Script.fromBase64(this.state.script_sig)

        return { vout, prevTxHash, script }
    }

    toRaw = () => {
        const def = (): IInputRaw => {
            return {
                prev_transaction_hash: this.get().prevTxHash()?.bytes() || new Uint8Array(),
                vout: this.get().vout().bytes('int16').bytes(),
                script_sig: this.get().script().bytes()
            }
        }

        const base64 = () => {
            return {
                prev_transaction_hash: this.get().prevTxHash()?.base64() || "",
                vout: this.get().vout().base64('int16'),
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

    size = (): number => {
		let size = 0
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as InputModel
			size += out.size()
		}
		return size + this.count()
	}

    prevTxIDndVoutList = (): {tx_id: string, vout: number}[] => {
        return this.map((i: InputModel) => {
            return {
                tx_id: i.get().prevTxHash(),
                vout: i.get().vout()
            }
        })
    }

    fetchPrevTxList = async (headerSignature: IHeaderSignature, userTxList: UTXOCollection) => {
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
                const listTxIDs = utxos.map((u) => u.get().txID())
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