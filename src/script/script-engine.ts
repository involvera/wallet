import { MAX_CONSTITUTION_RULE, TByte } from "../constant";
import { WRONG_CONSTITUTION_LENGTH, WRONG_PUBKH_FORMAT, WRONG_TX_HASH_FORMAT } from "../constant/errors";
import { EncodeInt, EncodeInt64, IsPubKHRightFormat, IsTxHashRightFormat } from "../util";
import { PROPOSAL_CODE, THREAD_CODE, VOTE_CODE } from "./constant";
import { SerialConstitution, TConstitution } from "./constitution";
import { CodesWithPubKHBytesArray, CodesWithTxIDBytesArray, PayingCodesBytesArray } from './format'


export default class ScriptEngine {

    private K: TByte
    private TA: Buffer[]

    constructor(k: TByte){
        this.K = k
        this.TA = []
    }

    targetScript = () => this.TA
    kind = () => this.K

    length = () => this.TA.length

    setTargetScript = (script: Buffer[]) => {
        this.TA = script
    }

    initWithPKH = (childIDX: number, pubKH: Buffer) => {
        this.setTargetScript([])
        this.addPubKH(childIDX, pubKH)
    }

    initWithPKHOnly = (pubKH: Buffer) => {
        this.TA = []
        this.addPubKH(-1, pubKH)
    }

    initWithTxID = (txID: Buffer) => {
        this.TA = []
        this.addTxID(txID)
    }

    addPubKH = (childIDX: number, pubKH: Buffer) => {
        if (!IsPubKHRightFormat(pubKH)){
            throw WRONG_PUBKH_FORMAT
        }

        if (CodesWithPubKHBytesArray().indexOf(this.kind()) != -1){
            childIDX >= 0 && this.TA.push(EncodeInt64(BigInt(childIDX)))
            this.TA.push(pubKH)
            return
        }

        throw new Error("Script error: addPubKH().")
    }

    addTxID = (txID: Buffer) => {
        if (!IsTxHashRightFormat(txID)){
            throw WRONG_TX_HASH_FORMAT
        }

        if (CodesWithTxIDBytesArray().indexOf(this.kind()) != -1){
            this.TA.push(txID)
            return
        }

        throw new Error("Script error: addTxID().")
    }

    addVout = (vout: number) => {
        if (CodesWithTxIDBytesArray().indexOf(this.kind()) != -1){
            this.TA.push(EncodeInt(BigInt(vout)))
            return
        }
        throw new Error("Script error: addVout().")
    }

    addConstitution = (consti: TConstitution) => {
        if (consti.length != MAX_CONSTITUTION_RULE){
            throw WRONG_CONSTITUTION_LENGTH
        }
        if (this.kind() === PROPOSAL_CODE){
            this.TA.push(SerialConstitution(consti))
            return
        }
        throw new Error("Script error: addConstitution().")
    }

    addVoteOutcome = (accept: boolean) => {
        if (this.kind() == VOTE_CODE){
            let outcome = 1
            if (!accept)
                outcome = 0
            this.TA.push(EncodeInt(BigInt(outcome)))
            return
        }
        throw new Error("Script error: addVoteOutcome().")
    }

    addThreadCost = (cost: number) => {
        this.addCost(THREAD_CODE, cost)
    } 

    addPropsalCost = (cost: number) => {
        this.addCost(PROPOSAL_CODE, cost)
    } 

    addCost = (byteCode: TByte, cost: number) => {
        if (this.kind() == PROPOSAL_CODE){
            if (PayingCodesBytesArray().indexOf(this.kind()) != -1){
                this.TA.push(Buffer.from([byteCode]))
                this.TA.push(EncodeInt64(BigInt(cost)))
                return
            }
        }
        throw new Error("Script error: addCost().")
    }
}
