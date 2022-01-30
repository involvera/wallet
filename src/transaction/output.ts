import { Model, Collection } from 'acey'
import {IOutputUnRaw, IOutputRaw } from 'community-coin-types'
import { Buffer } from 'buffer'
import { MAX_IS_2_POW_53 } from '../constant/errors'
import { ScriptEngine, Error } from 'wallet-script'
import { ByteArrayToB64, DoubleByteArrayToB64Array, EncodeArrayInt, EncodeInt64, 
	CalcTotalLengthDoubleByteArray, ToArrayBufferFromB64, PubKeyHashHexToUUID
} from 'wallet-util'

const DEFAULT_STATE: IOutputUnRaw = {
	input_src_idxs: [],
	value: 0,
	script: []
}

export class OutputModel extends Model {

	static DefaultState: IOutputUnRaw = DEFAULT_STATE

	static NewOutput = (value: number, InputSrcIdxs: number[], script: string[]) => {
		if (value > Math.pow(2, 53))
			throw MAX_IS_2_POW_53
		
		const out: IOutputUnRaw = {
			input_src_idxs: InputSrcIdxs,
			value,
			script
		}
		return new OutputModel(out, {})
	}
	
    constructor(output: IOutputUnRaw = DEFAULT_STATE, options: any) {
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
				script: this.get().script().bytes()
			}
		}

		const base64 = () => {
			const raw = def()
			return {
				input_src_idxs: DoubleByteArrayToB64Array(raw.input_src_idxs),
				value: ByteArrayToB64(raw.value), 
				script: this.get().script().base64()
			}
		}

		return { default: def, base64 }
	}

	get = () => {
		const value = (): BigInt => BigInt(this.state.value) 
		const inputSourceIdxs = (): number[] => this.state.input_src_idxs

		const scriptBase64 = (): string[] => this.state.script
		const script = () => new ScriptEngine(ToArrayBufferFromB64(scriptBase64()))
 		
		const contentPKH = (): Buffer => {
			const s = this.get().script()
			if (s.is().targetableContent())
				return s.parse().PKHFromContentScript()
			throw Error.NOT_A_TARGETABLE_CONTENT
		}

		const targetedContentPKH = (): Buffer => {
			const s = this.get().script()
			if (s.is().targetedContent())
				return s.parse().targetPKHFromContentScript()
			throw Error.NOT_A_TARGETING_CONTENT
		}

		const pubKH = (): Buffer => this.get().script().parse().PKHFromLockScript()
		const contentUUID = (): string => PubKeyHashHexToUUID(contentPKH().toString('hex'))

		return {
			value, inputSourceIdxs, script, scriptBase64,
			contentPKH, pubKH, targetedContentPKH, contentUUID
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

export class OutputCollection extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [OutputModel, OutputCollection], options)
    }


	size = (): number => {
		let size = 0
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as OutputModel
			size += out.size()
		}
		return size + this.count()
	}

	containsToPubKH = (pubKH: Buffer) => {
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as OutputModel
			if (out.get().pubKH().toString('hex') === pubKH.toString('hex'))
				return true
		}
		return false
	}

	countContent = (): number => {
		let count = 0;
		this.forEach((out: OutputModel) => {
			if (out.is2().content()){
				count++
			}
		})
		return count
	}

	get = () => {
		const totalValue = () => {
			let total = BigInt(0)
            this.map((out: OutputModel) => {
				total += BigInt(out.get().value() as any)
            })
            return total
		}
		return { totalValue }
	}
}


