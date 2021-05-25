import { 
    APPLICATION_PROPOSAL_SCRIPT_LENGTH, CONSTITUTION_PROPOSAL_SCRIPT_LENGTH, 
    MAX_CONSTITUTION_RULE, MAX_TX_OUTPUT, MAX_UNIT_WRITING_COST, PUBKEY_H_BURNER, 
    PUBKH_LENGTH, PUBK_LENGTH, RETHEAD_SCRIPT_LENGTH, REWARD_SCRIPT_LENGTH, TByte,
    THREAD_SCRIPT_LENGTH, VOTE_SCRIPT_LENGTH } from "../constant"

import { WRONG_PUBK_FORMAT, WRONG_PUBKH_FORMAT } from "../constant/errors"
import { DecodeInt, EncodeInt, EncodeInt64, IsInNumberArray } from "../util"
import { OPCODE_LIST, OP_CHECKSIG, OP_CONTENT, OP_DUP, OP_EQUALVERIFY, OP_HASH160 } from './opcode'

import { 
    PROPOSAL_APPLICATION__CAT_DEPTH_2, PROPOSAL__CAT_DEPTH_1, 
    PROPOSAL_COST_PROPOSAL__CAT_DEPTH_3, PROPOSAL_COST_THREAD__CAT_DEPTH_3,
    PROPOSAL_COST__CAT_DEPTH_2, PROPOSAL_CONSTITUTION__CAT_DEPTH_2,
    THREAD_THREAD__CAT_DEPTH_2, THREAD__CAT_DEPTH_1,
    THREAD_RETHREAD__CAT_DEPTH_2, REWARD__CAT_DEPTH_1,
    VOTE_DECLINED__CAT_DEPTH_2, VOTE_ACCEPTED__CAT_DEPTH_2,
    VOTE__CAT_DEPTH_1, TOTAL_MAX_LENGTH, COST_PROPOSAL_CAT_LIST, PROPOSAL_CODE, THREAD_CODE, REWARD_CODE, VOTE_CODE, EMPTY_CODE
} from './content'

import { 
    LOCK_SCRIPT_LENGTH, UNLOCKING_SCRIPT_LENGTH, 
    MAX_COST_PROPOSAL_SCRIPT_LENGTH, MIN_COST_PROPOSAL_SCRIPT_LENGTH 
} from '../constant'

import {
    WRONG_LOCK_SCRIPT, 
    NOT_A_TARGETABLE_CONTENT, NOT_A_TARGETING_CONTENT,
    NOT_A_CONSTITUTION_PROPOSAL, NOT_A_COST_PROPOSAL,
    NOT_A_REWARD_SCRIPT
} from '../constant/errors'


import { DeserializeConstitution, SerialConstitution, TConstitution } from "./constitution"

export class ScriptEngineV2 {


    static categoryDepth1ToString = (category: number): string => {
        switch (category) {
        case PROPOSAL__CAT_DEPTH_1:
            return "PROPOSAL"
        case THREAD__CAT_DEPTH_1:
            return "THREAD"
        case REWARD__CAT_DEPTH_1:
            return "REWARD"
        case VOTE__CAT_DEPTH_1:
            return "VOTE"
        }
        return ""
    }

    static categoryDepth2ToString = (category1: number, category2: number): string => {

        if (category1 == PROPOSAL__CAT_DEPTH_1) {
    
            switch (category2) {
            case PROPOSAL_APPLICATION__CAT_DEPTH_2:
                return "APPLICATION"
    
            case PROPOSAL_COST__CAT_DEPTH_2:
                return "COSTS"
    
            case PROPOSAL_CONSTITUTION__CAT_DEPTH_2:
                return "CONSTITUTION"
            }
    
        } else if (category1 == THREAD__CAT_DEPTH_1) {
    
            switch (category2) {
            case THREAD_THREAD__CAT_DEPTH_2:
                return "THREAD"
    
            case THREAD_RETHREAD__CAT_DEPTH_2:
                return "RETHREAD"
            }
    
        } else if (category1 == VOTE__CAT_DEPTH_1) {
    
            switch (category2) {
            case VOTE_ACCEPTED__CAT_DEPTH_2:
                return "ACCEPTED"
    
            case VOTE_DECLINED__CAT_DEPTH_2:
                return "DECLINED"
            }
        }
        return ""
    }

    static categoryDepth3ToString = (category1: number, category2: number, category3: number): string => {

        if (category1 == PROPOSAL__CAT_DEPTH_1) {
            if (category2 == PROPOSAL_COST__CAT_DEPTH_2) {
                switch (category3) {
                case PROPOSAL_COST_THREAD__CAT_DEPTH_3:
                    return "THREAD_PRICE"
    
                case PROPOSAL_COST_PROPOSAL__CAT_DEPTH_3:
                    return "PROPOSAL_PRICE"
                }
            }
        }
        return ""
    }

    private _script: Buffer[]

    constructor(script: Buffer[]){
        this._script = script
    }

    public length = (): number => this.get().length
    public get = ():  Buffer[] => this._script
    public set = (script: Buffer[]) => this._script = script

    public kind = () => {
        if (this.is().proposalScript())
            return PROPOSAL_CODE
        if (this.is().threadDepth1Script())
            return THREAD_CODE
        if (this.is().rewardScript())
            return REWARD_CODE
        if (this.is().voteScript()){
            return VOTE_CODE
        }
        return EMPTY_CODE
    }

    public kindString = () => {
        switch (this.kind()) {
            case PROPOSAL_CODE:
                return "proposal"
            case THREAD_CODE:
                return "thread"
            case VOTE_CODE:
                return "vote"
            case REWARD_CODE:
                return "reward"
            }
            return "regular"
    }

    public append = () => {
        
        const byte = (b: TByte) => {
            this.get().push(Buffer.from([b]))
            return true
        }
        const bytes = (bytes: Buffer) => {
            this.get().push(bytes)
            return true
        }

        const targetableContent = (nonce: number, contentPKH: Buffer) => {
            bytes(EncodeInt(BigInt(nonce)))
            bytes(contentPKH)            
            return true
        }
        const contentOPCode = () => byte(OP_CONTENT)

        const lockScript = (pubKeyHash: Buffer): ScriptEngineV2 => {
            if (pubKeyHash.length != PUBKH_LENGTH) {
                throw WRONG_PUBKH_FORMAT
            }
            byte(OP_DUP) && byte(OP_HASH160) && bytes(pubKeyHash) && byte(OP_EQUALVERIFY) && byte(OP_CHECKSIG)
            return this

        }

        const unlockScript = (signature: Buffer, pubKey: Buffer): ScriptEngineV2 => {
            if (pubKey.length != PUBKH_LENGTH) {
                throw WRONG_PUBK_FORMAT
            }
            bytes(signature) && bytes(pubKey)
            return this

        }

        const applicationProposalScript = (contentNonce: number, contentPKH: Buffer): ScriptEngineV2 => {
            targetableContent(contentNonce, contentPKH)
            byte(PROPOSAL_APPLICATION__CAT_DEPTH_2)
            byte(PROPOSAL__CAT_DEPTH_1)
            contentOPCode()
            return this

        }

        const costProposalScript = (contentNonce: number, contentPKH: Buffer, threadCost: BigInt, proposalCost: BigInt): ScriptEngineV2 => {
            targetableContent(contentNonce, contentPKH)
            if (threadCost > BigInt(0)){
                bytes(EncodeInt64(threadCost))
                byte(PROPOSAL_COST_THREAD__CAT_DEPTH_3)
            }
            if (proposalCost > BigInt(0)){
                bytes(EncodeInt64(proposalCost))
                byte(PROPOSAL_COST_PROPOSAL__CAT_DEPTH_3)
            }
            byte(PROPOSAL_COST__CAT_DEPTH_2)
            byte(PROPOSAL__CAT_DEPTH_1)
            contentOPCode()
            return this

        }

        const constitutionProposalScript = (contentNonce: number, contentPKH: Buffer, constitution: TConstitution): ScriptEngineV2 => {
            targetableContent(contentNonce, contentPKH)
            bytes(SerialConstitution(constitution))
            byte(PROPOSAL_CONSTITUTION__CAT_DEPTH_2)
            byte(PROPOSAL__CAT_DEPTH_1)
            contentOPCode()
            return this

        }

        const threadScript = (contentNonce: number, contentPKH: Buffer): ScriptEngineV2 => {
            targetableContent(contentNonce, contentPKH)
            byte(THREAD_THREAD__CAT_DEPTH_2)
            byte(THREAD__CAT_DEPTH_1)
            contentOPCode()
            return this

        }

        const rethreadScript = (contentNonce: number, contentPKH: Buffer, targetedThreadPKH: Buffer): ScriptEngineV2 => {
            targetableContent(contentNonce, contentPKH)
            bytes(targetedThreadPKH)
            byte(THREAD_RETHREAD__CAT_DEPTH_2)
            byte(THREAD__CAT_DEPTH_1)
            contentOPCode()
            return this

        }

        const rewardScript = (targetedThreadPKH: Buffer, voutRedistribution: number): ScriptEngineV2 => {
            bytes(targetedThreadPKH)
            byte(voutRedistribution as TByte)
            byte(REWARD__CAT_DEPTH_1)
            contentOPCode()
            return this
        }

        const voteScript = (targetedProposalPKH: Buffer, accept: boolean): ScriptEngineV2 => {
            let voteInt = VOTE_DECLINED__CAT_DEPTH_2
            if (accept) {
                voteInt = VOTE_ACCEPTED__CAT_DEPTH_2
            }
            bytes(targetedProposalPKH)
            byte(voteInt as TByte)
            byte(VOTE__CAT_DEPTH_1)
            contentOPCode()
            return this
        }

        return {
            lockScript,
            unlockScript,
            applicationProposalScript,
            costProposalScript,
            constitutionProposalScript,
            threadScript,
            rethreadScript,
            rewardScript,
            voteScript
        }
    }


    public parse = () => {
        const PKHFromLockScript = (): Buffer => {
            if(this.is().lockScript())
                return this.get()[2]
            if (this.is().contentScript())
                return Buffer.from(PUBKEY_H_BURNER, 'hex')
            throw WRONG_LOCK_SCRIPT
        }

        const PKHFromContentScript = (): Buffer => {
            if (this.is().threadDepth1Script() || this.is().proposalScript()){
                return this.get()[1]
            }
            throw NOT_A_TARGETABLE_CONTENT
        }

        const targetPKHFromContentScript = (): Buffer => {
            if (this.is().voteScript() || this.is().rewardScript()){
                this.get()[0]
            }
            if (this.is().rethreadScript()){
                this.get()[2]
            }
            throw NOT_A_TARGETING_CONTENT
        }

        const constitution = (): TConstitution => {
            if (this.is().constitutionProposalScript()){
                return DeserializeConstitution(this.get()[2])
            }
            throw NOT_A_CONSTITUTION_PROPOSAL
        }

        const proposalCosts = () => {
            if (this.is().costProposalScript()){
                let thread = BigInt(-1)
                let proposal = BigInt(-1)
                let i = 2
                while (this.get()[i].length == 8){
                    const price = DecodeInt(this.get()[i], false)
                    const cat = this.get()[i][0]
                    if (cat == PROPOSAL_COST_PROPOSAL__CAT_DEPTH_3)
                        proposal = BigInt(price)
                    if (cat == PROPOSAL_COST_THREAD__CAT_DEPTH_3)
                        thread = BigInt(price)
                    i += 2
                }
                return {
                    thread, proposal
                }
            }
            throw NOT_A_COST_PROPOSAL
        }

        const distributionVout = (): TByte => {
            if (this.is().rewardScript()){
                return this.get()[1][0] as TByte
            }
            throw NOT_A_REWARD_SCRIPT
        }


        return {
            PKHFromLockScript,
            PKHFromContentScript,
            targetPKHFromContentScript,
            constitution,
            proposalCosts,
            distributionVout
        }
    }

    public is = () => {
        const contentCategoryAtIndex = (index: TByte): boolean => {
            const e = this.get()[index]
            if (!e)
                return false
            if (e.length == 1) 
                return e[0] >= 1 && e[0] <= TOTAL_MAX_LENGTH
            return false
        }

        const opcodeAtIndex = (index: TByte): boolean => {
            const e = this.get()[index]
            if (!e)
                return false
            if (e.length == 1){
                for (let opcode of OPCODE_LIST){
                    if (e[0] == opcode){
                        return true
                    }
                }
            }
            return false
        }

        const indexContentCategory = (index: TByte, category: number): boolean => {
            if (contentCategoryAtIndex(index)){
                return this.get()[index][0] == category
            }
            return false
        }

        const indexOpcode = (index: TByte, opcode: number): boolean => {
            if (opcodeAtIndex(index)){
                return this.get()[index][0] == opcode
            }
            return false
        }

        const indexPKH = (index: TByte): boolean => {
            const e = this.get()[index]
            if (!e)
                return false
            return e.length == PUBKH_LENGTH
        }

        const indexSignature = (index: TByte): boolean => {
            const e = this.get()[index]
            if (!e)
                return false
            return e.length >= 66 && e.length <= 72
        }

        const indexPubKey = (index: TByte): boolean => {
            const e = this.get()[index]
            if (!e)
                return false
            return e.length == PUBK_LENGTH
        }

        const indexContentNonce = (index: TByte): boolean => {
            const e = this.get()[index]
            if (!e)
                return false
            const nonce = DecodeInt(e, false)
            if (nonce > BigInt(4294967295)) {
                return false
            }
            return true
        }

        const lockScript = (): boolean => {
            if (this.length() == LOCK_SCRIPT_LENGTH){
                return indexOpcode(0, OP_DUP) && indexOpcode(1, OP_HASH160) && indexPKH(2) && indexOpcode(3, OP_EQUALVERIFY) && indexOpcode(4, OP_CHECKSIG)
            }
            return false
        }

        const unlockingScript = (): boolean => {
            if (this.length() == UNLOCKING_SCRIPT_LENGTH){
                return indexSignature(0) && indexPubKey(1)
            }
            return false
        }

        const contentScript = (): boolean => {
            if (this.length() > 0){
                return indexOpcode(this.length() - 1 as TByte, OP_CONTENT)
            }
            return false
        }

        const proposalScript = (): boolean => {
            if (!contentScript()){
                return false
            }
            if (this.length() >= MIN_COST_PROPOSAL_SCRIPT_LENGTH && this.length() <= MAX_COST_PROPOSAL_SCRIPT_LENGTH){
                indexContentCategory(this.length() - 2 as TByte, PROPOSAL__CAT_DEPTH_1) && indexPKH(1) && indexContentNonce(0)
            }
            return false
        }

        const applicationProposalScript = (): boolean => {
            if (!proposalScript()){
                return false
            }
            if (this.length() == APPLICATION_PROPOSAL_SCRIPT_LENGTH){
                return indexContentCategory(2, PROPOSAL_APPLICATION__CAT_DEPTH_2)
            }
            return false
        }

        const costProposalScript = (): boolean => {
            if (!proposalScript()){
                return false
            }
            if (this.length() == MIN_COST_PROPOSAL_SCRIPT_LENGTH || this.length() == MAX_COST_PROPOSAL_SCRIPT_LENGTH){
               let i = 2
               while (this.get()[i].length == 8){
                   const cost = DecodeInt(this.get()[i], false)
                    if (cost <= BigInt(0) || cost > BigInt(MAX_UNIT_WRITING_COST)){
                        return false
                    }
                   const cat = this.get()[i][0]
                   if (!IsInNumberArray(COST_PROPOSAL_CAT_LIST, cat)) {
                       return false
                   }
                   i += 2
               }
               return indexContentCategory(i as TByte, PROPOSAL_COST__CAT_DEPTH_2)
            } 
            return false
        }

        const constitutionProposalScript = (): boolean => {
            if (!proposalScript()){
                return false
            }
            if (this.length() == CONSTITUTION_PROPOSAL_SCRIPT_LENGTH){
                return DeserializeConstitution(this.get()[2]).toString().split('\n').length == MAX_CONSTITUTION_RULE * 2
            }
            return false
        }

        const threadDepth1Script = (): boolean => {
            if (!contentScript()){
                return false
            }
            if (this.length() == THREAD_SCRIPT_LENGTH || this.length() == RETHEAD_SCRIPT_LENGTH){
                return indexContentNonce(0) && indexPKH(1) && indexContentCategory(this.length() - 2 as TByte, THREAD__CAT_DEPTH_1)
            }
            return false
        }

        const threadDepth2Script = (): boolean => {
            if (threadDepth1Script() && this.length() == THREAD_SCRIPT_LENGTH){
                return indexContentCategory(2, THREAD_THREAD__CAT_DEPTH_2)
            } 
            return false
        }

        const rethreadScript = (): boolean => {
            if (threadDepth1Script() && this.length() == RETHEAD_SCRIPT_LENGTH){
                return indexContentCategory(3, THREAD_RETHREAD__CAT_DEPTH_2)
            }
            return false
        }

        const rewardScript = (): boolean => {
            if (!contentScript()){
                return false
            }
            if (this.length() == REWARD_SCRIPT_LENGTH){
                const voutRedistribution = this.get()[1][0]
                if (voutRedistribution < 0 || voutRedistribution > MAX_TX_OUTPUT-1){
                    return false
                }
                return indexPKH(0) && indexContentCategory(2, REWARD__CAT_DEPTH_1)
            }
            return false
        }

        const voteScript = (): boolean => {
            if (!contentScript()){
                return false
            }
            if (this.length() == VOTE_SCRIPT_LENGTH){
                const vote = indexContentCategory(1, VOTE_ACCEPTED__CAT_DEPTH_2) || indexContentCategory(1, VOTE_DECLINED__CAT_DEPTH_2)
                const cat = indexContentCategory(2, VOTE__CAT_DEPTH_1)
                return indexPKH(0) && vote && cat
            }
            return false
        }

        const declinedVoteScript = (): boolean => {
            if (voteScript()){
                return indexContentCategory(1, VOTE_DECLINED__CAT_DEPTH_2)
            }
            return false
        }

        const acceptedVoteScript = (): boolean => {
            if (voteScript()){
                return indexContentCategory(1, VOTE_ACCEPTED__CAT_DEPTH_2)
            }
            return false
        }

        const targetableContent = (): boolean => threadDepth1Script() || proposalScript()
        const targetedContent = (): boolean => rewardScript() || voteScript() || rethreadScript()


        return {
                // contentCategoryAtIndex,
                // opcodeAtIndex,
                // indexContentCategory,
                // indexOpcode,
                // indexPKH,
                // indexSignature,
                // indexPubKey,
                // indexContentNonce,
            lockScript,
            unlockingScript,
            contentScript,
            proposalScript,
            applicationProposalScript,
            costProposalScript,
            constitutionProposalScript,
            threadDepth1Script,
            threadDepth2Script,
            rethreadScript,
            rewardScript,
            voteScript,
            declinedVoteScript,
            acceptedVoteScript,
            targetableContent,
            targetedContent
        }


    }





}