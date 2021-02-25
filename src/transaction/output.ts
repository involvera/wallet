import { Model, Collection } from 'acey'
import { MAX_IS_2_POW_53 } from '../constant/errors'
import { TByte } from '../constant/type'

export interface IOutput {
	input_indexes: number[]
	value:        number
	pub_key_hash:   string
	k:              TByte,
	ta:				Buffer[]
}

export class Output extends Model {

	static NewOutput = (pub_key_hash: string, value: number, inputIDX: number[], kind: TByte, ta: Buffer[]) => {
		if (value > Math.pow(2, 53))
			throw MAX_IS_2_POW_53
		
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


