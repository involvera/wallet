import { PROPOSAL_CODE, REWARD_CODE, THREAD_CODE, VOTE_CODE } from './constant'
import { TConstitution } from './constitution'
import ScriptEngine from './script-engine'

export const NewApplicationProposalScript = (contentNonce: number, pubkh: Buffer): ScriptEngine => {
    const script = new ScriptEngine(PROPOSAL_CODE)
    script.initWithPKH(contentNonce, pubkh)
    return script
}

export const NewConstitutionProposalScript = (contentNonce: number, pubkh: Buffer, c: TConstitution): ScriptEngine => {
    const script = new ScriptEngine(PROPOSAL_CODE)
    script.initWithPKH(contentNonce, pubkh)
    script.addConstitution(c)
    return script
}

export const NewCostProposalScript = (contentNonce: number, pubkh: Buffer, threadCost: number, proposalCost: number): ScriptEngine => {
    const script = new ScriptEngine(PROPOSAL_CODE)
    script.initWithPKH(contentNonce, pubkh)
    if (threadCost > 0){
        script.addThreadCost(threadCost)
    }
    if (proposalCost > 0){
        script.addPropsalCost(proposalCost)
    }
    return script
}

export const NewRewardScript = (txID: Buffer, vout: number, distributionVout: number): ScriptEngine => {
    const script = new ScriptEngine(REWARD_CODE)
    script.initWithTxID(txID)
    script.addVout(vout)
    script.addVout(distributionVout)
    return script
}

export const NewThreadScript = (contentNonce: number, pubkh: Buffer): ScriptEngine => {
    const script = new ScriptEngine(THREAD_CODE)
    script.initWithPKH(contentNonce, pubkh)
    return script
}

export const NewReThreadScript = (txID: Buffer, vout: number, contentNonce: number, pubkh: Buffer): ScriptEngine => {
    const script = new ScriptEngine(THREAD_CODE)
    script.initWithPKH(contentNonce, pubkh)
    script.addTxID(txID)
    script.addVout(vout)
    return script
}

export const NewProposalVoteScript = (txID: Buffer, vout: number, accept: boolean): ScriptEngine => {
    const script = new ScriptEngine(VOTE_CODE)
    script.initWithTxID(txID)
    script.addVout(vout)
    script.addVoteOutcome(accept)
    return script
} 