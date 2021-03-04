import { PROPOSAL_CODE, REWARD_CODE, THREAD_CODE, VOTE_CODE } from './constant'
import { TConstitution } from './constitution'
import ScriptEngine from './script-engine'

export const NewApplicationProposalScript = (childIdx: number, pubkh: Buffer): ScriptEngine => {
    const script = new ScriptEngine(PROPOSAL_CODE)
    script.initWithPKH(childIdx, pubkh)
    return script
}

export const NewConstitutionProposalScript = (childIdx: number, pubkh: Buffer, c: TConstitution): ScriptEngine => {
    const script = new ScriptEngine(PROPOSAL_CODE)
    script.initWithPKH(childIdx, pubkh)
    script.addConstitution(c)
    return script
}

export const NewCostProposalScript = (childIdx: number, pubkh: Buffer, threadCost: number, proposalCost: number): ScriptEngine => {
    const script = new ScriptEngine(PROPOSAL_CODE)
    script.initWithPKH(childIdx, pubkh)
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

export const NewThreadScript = (childIdx: number, pubkh: Buffer): ScriptEngine => {
    const script = new ScriptEngine(THREAD_CODE)
    script.initWithPKH(childIdx, pubkh)
    return script
}

export const NewReThreadScript = (txID: Buffer, vout: number, childIdx: number, pubkh: Buffer): ScriptEngine => {
    const script = new ScriptEngine(THREAD_CODE)
    script.initWithPKH(childIdx, pubkh)
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