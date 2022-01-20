import { Model } from "acey";
import { IUserVote } from 'community-coin-types'
import moment from 'moment'

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
            voteLH: (): number => this.state.vote_lh,
            createdAtPretty: (currentLH: number): string =>{
                const vlh = this.get().voteLH()
                const diffLH = currentLH - vlh
                if (diffLH < 3)
                    return 'newly'
                if (diffLH < 6)
                    return 'recently'
                let d = new Date().getTime()
                d -= (Math.ceil(diffLH / 3) * 24 * 60 * 60 * 1000)
                return moment(d).fromNow()
            }
        }
    }
}