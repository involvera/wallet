import { Model, Collection } from 'acey'
import { MAX_IS_2_POW_53 } from '../constant/errors'
import { TByte } from '../constant/type'
import { ByteArrayToB64, DoubleByteArrayToB64Array, EncodeArrayInt, EncodeInt64 } from '../util'
import { ToArrayBuffer } from '../util/bytes'

export interface IOutput {
	input_indexes: number[]
	value:        number
	pub_key_hash:   string
	k:              TByte,
	ta:				Buffer[]
}

export interface IOutputRaw {
	input_indexes: Buffer[]
	value:        Buffer
	pub_key_hash:   Buffer
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
		output && !output.input_indexes && this.setState({ input_indexes: [] })
	}

	toRaw = () => {
		const def = (): IOutputRaw  => {
			return {
				input_indexes: EncodeArrayInt(this.get().inputIndexes()),
				value: EncodeInt64(this.get().value()),
				pub_key_hash: Buffer.from(this.get().pubKH(), 'hex'),
				k: this.get().K(),
				ta: ToArrayBuffer(this.get().target())
			}
		}

		const base64 = () => {
			const raw = def()
			return {
				input_indexes: DoubleByteArrayToB64Array(raw.input_indexes),
				value: ByteArrayToB64(raw.value), 
				pub_key_hash: ByteArrayToB64(raw.pub_key_hash),
				k: raw.k,
				ta: DoubleByteArrayToB64Array(raw.ta)
			}
		}

		return { default: def, base64 }
	}

	get = () => {
		const value = (): BigInt => this.state.value 
		const inputIndexes = (): number[] => this.state.input_indexes
		const pubKH = (): string => this.state.pub_key_hash
		const K = (): TByte => this.state.k
		const target = (): Buffer[] => this.state.ta

		return {
			value, inputIndexes, pubKH, K, target
		}
	}

	isValueAbove = (val: BigInt) => val < this.get().value()
}

export class OutputList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Output, OutputList], options)
    }

	containsToPubKH = (pubKH: string) => {
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as Output
			if (out.get().pubKH() === pubKH)
				return true
		}
		return false
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


