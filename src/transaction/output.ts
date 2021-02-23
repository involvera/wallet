import { Model, Collection } from 'acey'
import { TByte } from '../constant/type'
import { ByteArrayToInt, DecodeArrayInt, B64ToByteArray, Int64ToByteArray } from '../util'
import { EncodeArrayInt } from '../util/bytes'

export interface IOutput {
	input_indexes: Uint8Array[] 
	value:        Uint8Array
	pub_key_hash:   Uint8Array
	k:              TByte,
	ta:				Uint8Array[]
}

export class Output extends Model {
	

	static NewOutput = (pubKeyHash: Uint8Array, value: BigInt, inputIDX: number[], kind: TByte, ta: Uint8Array[]) => {
		const out: IOutput = {
			value: Int64ToByteArray(value),
			pub_key_hash: pubKeyHash,
			input_indexes: EncodeArrayInt(inputIDX),
			k: kind,
			ta
		}
		return new Output(out, {})
	}

    constructor(output: IOutput, options: any) {
		super(output, options)
	}

	get = () => {
		const value = (): Uint8Array => B64ToByteArray(this.state.value)
		const valueBigInt = () => ByteArrayToInt(value(), false)
		const inputIndexes = (): Uint8Array[] => this.state.input_indexes
		const inputIndexesBigInt = () => DecodeArrayInt(inputIndexes())
		const pubKH = (): Uint8Array => B64ToByteArray(this.state.pub_key_hash)

		return {
			value, valueBigInt, inputIndexes, inputIndexesBigInt, pubKH
		}
	}

	isValueAbove = (val: BigInt) => val < this.get().valueBigInt()
}

export class OutputList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Output, OutputList], options)
    }

	get = () => {
		const totalValue = () => {
			let total = BigInt(0)
            this.map((out: Output) => {
				total += BigInt(out.get().valueBigInt())
				console.log(total)
            })
            return total
		}
		return { totalValue }
	}
}


