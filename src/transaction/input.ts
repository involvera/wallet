import { Collection, Model } from 'acey'
import { StringToByteArray, ByteArrayToString, ByteArrayToInt, AreEqual, B64ToByteArray } from '../util'

export interface IInput {
    prev_transaction_hash: Uint8Array
    vout: Uint8Array
    sign: Uint8Array
}

export class Input extends Model {

    constructor(input: IInput, options: any) {
        super(input, options)
    }

    prevTxHash = (): Uint8Array => B64ToByteArray(this.state.prev_transaction_hash)

    getVout = (): Uint8Array => B64ToByteArray(this.state.vout)
    getVoutBigInt = () => ByteArrayToInt(this.getVout(), AreEqual(this.getVout(), new Uint8Array([255,255,255,255])))
}

export class InputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Input, InputList], options)
    }

}