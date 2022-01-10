import { Model } from "acey";

export interface IUserVote {
    has_approved: boolean
    vote_lh: number
}

export const DEFAULT_STATE: IUserVote = {
    has_approved: false,
    vote_lh: -1
}

export class UserVoteModel extends Model {

    static DefaultState: IUserVote = DEFAULT_STATE

    constructor(state: IUserVote = DEFAULT_STATE, options: any){
        super(state, options) 
    }

    get = () => {
        return {
            hasApproved: (): number => this.state.closedAtLH,
            voteLH: (): number => this.state.vote_lh
        }
    }
}