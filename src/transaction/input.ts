import { Collection, Model } from 'acey'
import { ByteArrayToInt, B64ToByteArray } from '../util'

export interface IInput {
    prev_transaction_hash: Uint8Array
    vout: Uint8Array
    sign: Uint8Array
}

export class Input extends Model {

    constructor(input: IInput, options: any) {
        super(input, options)
    }

    get = () => {
        const prevTxHash = (): Uint8Array => B64ToByteArray(this.state.prev_transaction_hash)
        const vout = (): Uint8Array => B64ToByteArray(this.state.vout)
        const voutBigInt = () => ByteArrayToInt(vout(), JSON.stringify(vout) === JSON.stringify(new Uint8Array([255,255,255,255])))

        return { vout, voutBigInt, prevTxHash }
    }
}

export class InputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Input, InputList], options)
    }
}