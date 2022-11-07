import { Model } from "acey";
import { ONCHAIN } from 'community-coin-types'
import moment from 'moment'

const DEFAULT_STATE: ONCHAIN.IUserVote = {
    has_approved: false,
    vote_time: -1
}

export class UserVoteModel extends Model {

    static DefaultState: ONCHAIN.IUserVote = DEFAULT_STATE

    constructor(state: ONCHAIN.IUserVote = DEFAULT_STATE, options: any){
        super(state, options)
    }

    get = () => {
        return {
            hasApproved: (): boolean => this.state.has_approved,
            voteTime: (): number => this.state.vote_time,
            createdAtPretty: () => moment(new Date(this.get().voteTime() * 1000)).fromNow()
        }
    }
}