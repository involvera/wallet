import { Collection, Model } from 'acey'
import { ScriptEngineV2 } from '../scriptV2'
import { ByteArrayToB64, EncodeInt, CalcTotalLengthDoubleByteArray } from '../util'
import { DoubleByteArrayToB64Array, ToArrayBufferFromB64 } from '../util/bytes'

export interface IInput {
    prev_transaction_hash: string
    vout: number
    script_sig: string[]
}

export interface IInputRaw {
    prev_transaction_hash: Buffer
    vout: Buffer
    script_sig: Buffer[]
}

export class Input extends Model {

    constructor(input: IInput, options: any) {
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
        const script = () => new ScriptEngineV2(ToArrayBufferFromB64(scriptBase64()))

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

export class InputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Input, InputList], options)
    }

    size = (): number => {
		let size = 0
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as Input
			size += out.size()
		}
		return size + this.count()
	}

}