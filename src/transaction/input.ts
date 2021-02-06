import { TByte } from '../constant/type'
import { StringToByteArray, ByteArrayToString, Int64ToByteArray, IntToByteArray, ByteArrayToInt } from '../util'

export interface IInput {
    prev_transaction_hash: TByte[]
    vout: TByte[]
    sign: TByte[]
}

export class Input {

    static Deserialize = (serialized: TByte[]) => {
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