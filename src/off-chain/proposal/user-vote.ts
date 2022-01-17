import { Model } from "acey";
import { IUserVote } from 'community-coin-types'

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
            hasApproved: (): boolean => this.state.has_approved,
            voteLH: (): number => this.state.vote_lh
        }
    }
}