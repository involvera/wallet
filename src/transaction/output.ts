import { TByte } from '../constant/type'
import { StringToByteArray, ByteArrayToString, ByteArrayToInt, DecodeArrayInt } from '../util'

export interface IOutput {
	input_indexes: Uint8Array[] 
	value:        Uint8Array
	pub_key_hash:   Uint8Array
	k:              TByte,
	ta:				Uint8Array[]
}

export class Output {
    static Deserialize = (serialized: Uint8Array) => {
        return new Output(JSON.parse(ByteArrayToString(serialized)))
    }

    public output: IOutput
    
    constructor(output: IOutput) {
        this.output = output
    }

    Serialize = () => StringToByteArray(JSON.stringify(this.output))

	GetValue = () => this.output.value
	GetValueBigInt = () => ByteArrayToInt(this.GetValue(), false)

	IsValueAbove = (val: BigInt) => val < this.GetValueBigInt()
	
	GetInputIndexes = () => this.output.input_indexes
	GetInputIndexesBigInt = () => DecodeArrayInt(this.GetInputIndexes())

	GetPubKH = () => this.output.pub_key_hash
}