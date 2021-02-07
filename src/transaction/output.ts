import { Model, Collection } from 'acey'
import { TByte } from '../constant/type'
import { StringToByteArray, ByteArrayToString, ByteArrayToInt, DecodeArrayInt } from '../util'

export interface IOutput {
	input_indexes: Uint8Array[] 
	value:        Uint8Array
	pub_key_hash:   Uint8Array
	k:              TByte,
	ta:				Uint8Array[]
}

export class Output extends Model {
	
    static deserialize = (serialized: Uint8Array): IOutput => {
        return JSON.parse(ByteArrayToString(serialized))
    }

    constructor(output: IOutput, options: any) {
		super(output, options)
	}

    serialize = () => StringToByteArray(this.to().string())

	getValue = (): Uint8Array => StringToByteArray(Buffer.from(this.state.value, 'base64').toString('utf-8'))
	getValueBigInt = () => ByteArrayToInt(this.getValue(), false)

	isValueAbove = (val: BigInt) => val < this.getValueBigInt()
	
	getInputIndexes = (): Uint8Array[] => this.state.input_indexes
	getInputIndexesBigInt = () => DecodeArrayInt(this.getInputIndexes())

	getPubKH = (): Uint8Array => StringToByteArray(Buffer.from(this.state.pub_key_hash, 'base64').toString('utf-8'))
}

export class OutputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Output, OutputList], options)
    }
}