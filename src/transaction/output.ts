import { TByte } from '../constant/type'
import { StringToByteArray, ByteArrayToString, Int64ToByteArray, IntToByteArray, ByteArrayToInt, DecodeArrayInt } from '../util'

export interface IOutput {
	input_indexes: TByte[][] 
	value:        TByte[]
	pub_key_hash:   TByte[]
	k:              TByte,
	ta:         TByte[][]
}

class Output {

    static Deserialize = (serialized: TByte[]) => {
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