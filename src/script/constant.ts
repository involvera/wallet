import { TByte } from "../constant"

export const EMPTY_CODE = 0x00    //0
export const THREAD_CODE = 0x01   //1
export const PROPOSAL_CODE = 0x02 //2
export const VOTE_CODE = 0x03     //3
export const REWARD_CODE = 0x04   //upvote and reaction

export type TCodeSort = {
    [key: string]: TByte;
};

export const PAYING_CODES: TCodeSort = {
    PROPOSAL: PROPOSAL_CODE,
    THREAD: THREAD_CODE,
    REWARD: REWARD_CODE
}

export const WRITING_CODES: TCodeSort = {
    PROPOSAL: PROPOSAL_CODE,
    THREAD: THREAD_CODE,
    REWARD: REWARD_CODE,
    VOTE: VOTE_CODE,
}

export const CODES_WITH_PUBKH: TCodeSort = {
    PROPOSAL: PROPOSAL_CODE,
    THREAD: THREAD_CODE
}

export const CODES_WITH_TXID:TCodeSort = {
    VOTE: VOTE_CODE,
    REWARD: REWARD_CODE,
    THREAD: THREAD_CODE,
}

export const CODES_WITH_TXID_AND_PUBKH: TCodeSort = {
    THREAD: THREAD_CODE
}

export const CONSTITUTION_PROPOSAL_SCRIPT_LENGTH = 3
export const APPLICATION_PROPOSAL_SCRIPT_LENGTH = 2
export const ECONOMICAL_PROPOSAL_SCRIPT_1_ELEM = 4
export const ECONOMICAL_PROPOSAL_SCRIPT_2_ELEM = 6
export const VOTE_SCRIPT_LENGTH = 3
export const THREAD_SCRIPT_LENGTH = 2
export const RE_THREAD_SCRIPT_LENGTH = 4
export const REWARD_SCRIPT_LENGTH = 3