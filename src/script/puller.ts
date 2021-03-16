import { DecodeInt } from "../util"
import { PROPOSAL_CODE, THREAD_CODE } from "./constant"
import ScriptEngine from "./script-engine"

export default (s: ScriptEngine) => {

    const childIdx = (): number => {
        return Number(DecodeInt(s.targetScript()[0], false))
    }

    const pubkh = (): Buffer => {
        return s.targetScript()[1]
    }

    const serializedConstitution = () => {
        return s.targetScript()[2]
    }

    const costs = () => {
        let thread = -1
        let proposal = -1

        for (let i = 0; i < s.length(); i += 2){
            const bytecode = s.targetScript()[i][0]
            const price = Number(DecodeInt(s.targetScript()[i+1], false))
            switch (bytecode){
                case THREAD_CODE:
                   thread = price 
                case PROPOSAL_CODE:
                    proposal = price
            }
        }

        return { thread, proposal }
    }

    const txID = () => {
        if (s.kind() == THREAD_CODE){
            return s.targetScript()[2]
        }
        return s.targetScript()[0]
    }

    const vout = () => {
        if (s.kind() == THREAD_CODE){
            return DecodeInt(s.targetScript()[3], false)
        }
        return DecodeInt(s.targetScript()[1], false)
    }

    const distributionVout = () => {
        return Number(DecodeInt(s.targetScript()[2], false))
    }

    const isVoteAccepted = () => {
        const oc = Number(DecodeInt(s.targetScript()[2], false))
        return oc == 1
    }

    return {
        childIdx, pubkh, serializedConstitution, costs, txID, vout, distributionVout, isVoteAccepted 
    }
}