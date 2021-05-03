import { Model, Collection } from 'acey'
import { MAX_IS_2_POW_53 } from '../constant/errors'
import { TByte } from '../constant/type'
import ScriptEngine from '../script/script-engine'
import { ByteArrayToB64, DoubleByteArrayToB64Array, EncodeArrayInt, EncodeBaseUUID, EncodeInt64 } from '../util'
import { ToArrayBufferFromB64 } from '../util/bytes'
import { PubKeyHashHexToUUID } from '../util/hash'

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
			input_indexes: inputIDX,
			value,
			pub_key_hash,
			k: kind,
			ta
		}
		return new Output(out, {})
	}
	
    constructor(output: IOutput, options: any) {
		super(output, options)
		output && !output.input_indexes && this.setState({ input_indexes: [] })
		output && !output.ta && this.setState({ ta: [] })
	}

	toRaw = () => {
		const def = (): IOutputRaw  => {
			return {
				input_indexes: EncodeArrayInt(this.get().inputIndexes()),
				value: EncodeInt64(this.get().value()),
				pub_key_hash: Buffer.from(this.get().pubKH(), 'hex'),
				k: this.get().K(),
				ta: ToArrayBufferFromB64(this.get().target())
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
		const script = () => new ScriptEngine(this.get().K()).setTargetScript(this.toRaw().default().ta)
 		const pubKHHexContent = (): string => {
			const is = this.is2()
			if (is.thread() || is.rethread() || is.proposal())
				return script().pull().pubkh().toString('hex')
			return ''
		}
		const contentUUID = (): string => PubKeyHashHexToUUID(pubKHHexContent())

		const K = (): TByte => this.state.k
		const target = (): string[] => this.state.ta

		return {
			value, inputIndexes, pubKH, K, 
			target, script, pubKHHexContent, contentUUID
		}
	}

	is2 = () => {
		const script = this.get().script()
		return {
			proposal: () => script.is().proposal(),
			applicationProposal: () => script.is().applicationProposal(),
			constitutionProposal: () => script.is().constitutionProposal(),
			costProposal: () => script.is().costProposal(),
			reward: () => script.is().reward(),
			thread: () => script.is().thread(),
			rethread: () => script.is().rethread(),
			vote: () => script.is().vote(),
			content: () => script.is().rethread() || script.is().thread() || script.is().proposal()
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

	countContent = (): number => {
		let count = 0;
		this.forEach((out: Output) => {
			if (out.is2().content()){
				count++
			}
		})
		return count
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


