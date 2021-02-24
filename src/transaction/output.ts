import { Model, Collection } from 'acey'
import { TByte } from '../constant/type'

export interface IOutput {
	input_indexes: number[]
	value:        BigInt
	pub_key_hash:   string
	k:              TByte,
	ta:				Uint8Array[]
}

export class Output extends Model {
	

	static NewOutput = (pub_key_hash: string, value: BigInt, inputIDX: number[], kind: TByte, ta: Uint8Array[]) => {
		const out: IOutput = {
			value,
			pub_key_hash,
			input_indexes: inputIDX,
			k: kind,
			ta
		}
		return new Output(out, {})
	}

    constructor(output: IOutput, options: any) {
		super(output, options)
	}

	get = () => {
		const value = (): BigInt => this.state.value
		const inputIndexes = (): number[] => this.state.input_indexes
		const pubKH = (): string => this.state.pub_key_hash

		return {
			value, inputIndexes, pubKH
		}
	}

	isValueAbove = (val: BigInt) => val < this.get().value()
}

export class OutputList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Output, OutputList], options)
    }

	get = () => {
		const totalValue = () => {
			let total = BigInt(0)
            this.map((out: Output) => {
				total += BigInt(out.get().value())
            })
            return total
		}
		return { totalValue }
	}
}


