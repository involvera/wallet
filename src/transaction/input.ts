import { StringToByteArray, ByteArrayToString, ByteArrayToInt } from '../util'

export interface IInput {
    prev_transaction_hash: Uint8Array
    vout: Uint8Array
    sign: Uint8Array
}

export class Input {

    static Deserialize = (serialized: Uint8Array) => {
        return new Input(JSON.parse(ByteArrayToString(serialized)))
    }

    public input: IInput
    
    constructor(input: IInput) {
        this.input = input
    }

    Serialize = () => StringToByteArray(JSON.stringify(this.input))

    GetVout = () => this.input.vout
    GetVoutBigInt = () => ByteArrayToInt(this.GetVout(), JSON.stringify(this.GetVout()) == [255,255,255,255].toString())

}