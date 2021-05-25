import { Model, Collection } from 'acey'
import { MAX_IS_2_POW_53, NOT_A_TARGETABLE_CONTENT, NOT_A_TARGETING_CONTENT } from '../constant/errors'
import  { ScriptEngineV2 } from '../scriptV2'
import { ByteArrayToB64, DoubleByteArrayToB64Array, EncodeArrayInt, EncodeInt64, CalcTotalLengthDoubleByteArray } from '../util'
import { ToArrayBufferFromB64 } from '../util/bytes'

export interface IOutput {
	input_src_idxs: number[]
	value:        number
	script:				Buffer[]
}

export interface IOutputRaw {
	input_src_idxs: Buffer[]
	value:        Buffer
	script:				Buffer[]
}

export class Output extends Model {

	static NewOutput = (value: number, InputSrcIdxs: number[], script: Buffer[]) => {
		if (value > Math.pow(2, 53))
			throw MAX_IS_2_POW_53
		
		const out: IOutput = {
			value,
			input_src_idxs: InputSrcIdxs,
			script
		}
		return new Output(out, {})
	}
	
    constructor(output: IOutput, options: any) {
		super(output, options)
		output && !output.input_src_idxs && this.setState({ input_src_idxs: [] })
		output && !output.script && this.setState({ ta: [] })
	}

    size = (): number => {
        const raw = this.toRaw().default()
        let size = raw.value.length
        size += CalcTotalLengthDoubleByteArray(raw.script)
		size += CalcTotalLengthDoubleByteArray(raw.input_src_idxs)
        return size
    }

	toRaw = () => {
		const def = (): IOutputRaw  => {
			return {
				input_src_idxs: EncodeArrayInt(this.get().inputSourceIdxs()),
				value: EncodeInt64(this.get().value()),
				script: ToArrayBufferFromB64(this.get().scriptBase64())
			}
		}

		const base64 = () => {
			const raw = def()
			return {
				input_src_idxs: DoubleByteArrayToB64Array(raw.input_src_idxs),
				value: ByteArrayToB64(raw.value), 
				script: DoubleByteArrayToB64Array(raw.script)
			}
		}

		return { default: def, base64 }
	}

	get = () => {
		const value = (): BigInt => this.state.value 
		const inputSourceIdxs = (): number[] => this.state.input_src_idxs

		const script = () => new ScriptEngineV2(this.toRaw().default().script)
 		
		const contentPKH = (): string => {
			const s = this.get().script()
			if (s.is().targetableContent())
				return s.parse().PKHFromContentScript().toString('hex')
			throw NOT_A_TARGETABLE_CONTENT
		}

		const targetedContentPKH = (): string => {
			const s = this.get().script()
			if (s.is().targetedContent())
				return s.parse().targetPKHFromContentScript().toString('hex')
			throw NOT_A_TARGETING_CONTENT
		}

		const pubKH = (): string => this.get().script().parse().PKHFromLockScript().toString('hex')

		// const contentUUID = (): string => PubKeyHashHexToUUID(pubKHHexContent())


		const scriptBase64 = (): string[] => this.state.script

		return {
			value, inputSourceIdxs, script, scriptBase64,
			contentPKH, pubKH, targetedContentPKH
		}
	}

	is2 = () => {
		const script = this.get().script()
		return {
			proposal: () => script.is().proposalScript(),
			applicationProposal: () => script.is().applicationProposalScript(),
			constitutionProposal: () => script.is().constitutionProposalScript(),
			costProposal: () => script.is().costProposalScript(),
			reward: () => script.is().rewardScript(),
			thread: () => script.is().threadDepth2Script(),
			rethread: () => script.is().rethreadScript(),
			vote: () => script.is().voteScript(),
			content: () => script.is().threadDepth1Script() || script.is().proposalScript()
		}
	}

	isValueAbove = (val: BigInt) => val < this.get().value()
}

export class OutputList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Output, OutputList], options)
    }


	size = (): number => {
		let size = 0
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as Output
			size += out.size()
		}
		return size + this.count()
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


