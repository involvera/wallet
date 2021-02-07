import { Collection, Model } from 'acey'
import { StringToByteArray, ByteArrayToString, ByteArrayToInt, AreEqual } from '../util'

export interface IInput {
    prev_transaction_hash: Uint8Array
    vout: Uint8Array
    sign: Uint8Array
}

export class Input extends Model {

    static deserialize = (serialized: Uint8Array): IInput => {
        return JSON.parse(ByteArrayToString(serialized))
    }

    constructor(input: IInput, options: any) {
        super(input, options)
    }

    prevTxHash = (): Uint8Array => StringToByteArray(Buffer.from(this.state.prev_transaction_hash, 'base64').toString('utf-8'))
    
    serialize = () => StringToByteArray(this.to().string())

    getVout = (): Uint8Array => StringToByteArray(Buffer.from(this.state.vout, 'base64').toString('utf-8'))
    getVoutBigInt = () => ByteArrayToInt(this.getVout(), AreEqual(this.getVout(), new Uint8Array([255,255,255,255])))
}

export class InputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Input, InputList], options)
    }

}