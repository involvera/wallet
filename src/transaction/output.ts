import { Model, Collection } from 'acey'
import { TByte } from '../constant/type'
import { StringToByteArray, ByteArrayToString, ByteArrayToInt, DecodeArrayInt, B64ToByteArray } from '../util'

export interface IOutput {
	input_indexes: Uint8Array[] 
	value:        Uint8Array
	pub_key_hash:   Uint8Array
	k:              TByte,
	ta:				Uint8Array[]
}

export class Output extends Model {
	
    constructor(output: IOutput, options: any) {
		super(output, options)
	}

	getValue = (): Uint8Array => B64ToByteArray(this.state.value)
	getValueBigInt = () => ByteArrayToInt(this.getValue(), false)

	isValueAbove = (val: BigInt) => val < this.getValueBigInt()
	
	getInputIndexes = (): Uint8Array[] => this.state.input_indexes
	getInputIndexesBigInt = () => DecodeArrayInt(this.getInputIndexes())

	getPubKH = (): Uint8Array => B64ToByteArray(this.state.pub_key_hash)
}

export class OutputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Output, OutputList], options)
    }
}