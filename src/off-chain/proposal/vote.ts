import { Model } from "acey";

export interface IVote {
    approved: number
    declined: number
    closed_at_lh: number
}

export const DEFAULT_STATE: IVote = {
    approved: -1,
    declined: -1,
    closed_at_lh: 0
}

export class VoteModel extends Model {

    constructor(state: IVote = DEFAULT_STATE, options: any){
        super(state, options) 
    }

    get = () => {
        return {
            approved: (): number => this.state.approved,
            declined: (): number => this.state.declined,
            closedAtLH: (): number => this.state.closed_at_lh,
        }
    }
}