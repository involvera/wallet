import { Collection, Model } from 'acey'
import config from '../config'
import { IInputRaw, IInputUnRaw } from 'community-coin-types'
import { ScriptEngine } from 'wallet-script'
import { Buffer } from 'buffer'
import { ByteArrayToB64, EncodeInt, CalcTotalLengthDoubleByteArray, ToArrayBufferFromB64 } from 'wallet-util'
import { IHeaderSignature } from '../wallet'
import { UTXOCollection, UTXOModel } from './utxo'
import axios from 'axios'
import { TransactionModel } from './transaction'

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
        size += CalcTotalLengthDoubleByteArray(raw.script_sig)
        size += raw.vout.length
        return size
    }

    get = () => {
        const prevTxHash = (): string => this.state.prev_transaction_hash || ''
        const vout = (): number => {
            if (typeof this.state.vout === 'number')
                return this.state.vout
            return -1
        }
        const scriptBase64 = (): string[] => this.state.script_sig
        const script = () => new ScriptEngine(ToArrayBufferFromB64(scriptBase64()))

        return { vout, prevTxHash, scriptBase64, script }
    }

    toRaw = () => {
        const def = (): IInputRaw => {
            return {
                prev_transaction_hash: Buffer.from(this.get().prevTxHash(), 'hex'),
                vout: EncodeInt(BigInt(this.get().vout())),
                script_sig: this.get().script().bytes()
            }
        }

        const base64 = () => {
            const raw = def()
            return {
                prev_transaction_hash: ByteArrayToB64(raw.prev_transaction_hash),
                vout: ByteArrayToB64(raw.vout), 
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