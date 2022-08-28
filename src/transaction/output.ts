import { Model, Collection } from 'acey'
import {IOutputUnRaw, IOutputRaw } from 'community-coin-types'
import { MAX_IS_2_POW_53 } from '../constant/errors'
import { Error, Script } from 'wallet-script'
import { Inv } from 'wallet-util'


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
		const { value,input_src_idxs } = this.toRaw().default()

        let size = value.length
        size += this.get().script().fullSizeOctet()
		size += Inv.InvBuffer.FromUint8s(...input_src_idxs).length()
        return size
    }

	toRaw = () => {
		const def = (): IOutputRaw  => {
			return {
				input_src_idxs: Inv.ArrayInvBigInt.fromNumbers(this.get().inputSourceIdxs()).toArrayBuffer('int16').toDoubleUInt8Array(),
				value: this.get().value().bytes('uint64').bytes(),
				script: this.get().script().bytes()
			}
		}

		const base64 = () => {
			return {
				input_src_idxs: Inv.ArrayInvBigInt.fromNumbers(this.get().inputSourceIdxs()).toArrayBuffer('int16').toArrayBase64(),
				value: this.get().value().base64('uint64'),
				script: this.get().script().base64()
			}
		}

		return { default: def, base64 }
	}

	get = () => {
		const value = (): Inv.InvBigInt => new Inv.InvBigInt(BigInt(this.state.value))
		const inputSourceIdxs = (): number[] => this.state.input_src_idxs

		const script = () => Script.fromBase64(this.state.script)
 		
		const contentPKH = () => {
			const s = this.get().script()
			if (s.is().targetableScript())
				return s.parse().PKHFromContentScript()
			throw Error.NOT_A_TARGETABLE_CONTENT
		}

		const targetedContentPKH = () => {
			const s = this.get().script()
			if (s.is().targetingcript())
				return s.parse().targetPKHFromContentScript()
			throw Error.NOT_A_TARGETING_CONTENT
		}

		const pubKH = () => this.get().script().parse().PKHFromLockScript()

		return {
			value, inputSourceIdxs, script,
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
			thread: () => script.is().threadD2Script(),
			rethread: () => script.is().rethreadD2Script(),
			vote: () => script.is().voteScript(),
			content: () => script.is().threadD1Script() || script.is().proposalScript()
		}
	}
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

	containsToPubKH = (pubKH: Inv.PubKH) => {
		for (let i = 0; i < this.count(); i++){
			const out = this.nodeAt(i) as OutputModel
			if (pubKH.eq(out.get().pubKH()))
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


