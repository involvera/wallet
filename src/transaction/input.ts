import { Collection, Model } from 'acey'
import { ByteArrayToB64, DecodeInt, EncodeInt } from '../util'

export interface IInput {
    prev_transaction_hash: string
    vout: number
    sign: string
}

export interface IInputRaw {
    prev_transaction_hash: Buffer
    vout: Buffer
    sign: Buffer
}

export class Input extends Model {

    constructor(input: IInput, options: any) {
        super(input, options)
    }

    get = () => {
        const prevTxHash = (): string => this.state.prev_transaction_hash || ''
        const vout = (): number => {
            if (typeof this.state.vout === 'number')
                return this.state.vout
            return -1
        }
        const signature = (): string => this.state.sign || ''

        return { vout, prevTxHash, signature }
    }

    toRaw = () => {
        const def = (): IInputRaw => {
            return {
                prev_transaction_hash: Buffer.from(this.get().prevTxHash(), 'hex'),
                vout: EncodeInt(BigInt(this.get().vout())),
                sign: Buffer.from(this.get().signature(), 'hex')
            }
        }

        const base64 = () => {
            const raw = def()
            return {
                prev_transaction_hash: ByteArrayToB64(raw.prev_transaction_hash),
                vout: ByteArrayToB64(raw.vout), 
                sign: ByteArrayToB64(raw.sign)
            }
        }
        
        return { default: def, base64 }
    }

}

export class InputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Input, InputList], options)
    }
}