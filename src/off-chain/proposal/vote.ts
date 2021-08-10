import { Model } from "acey";

export interface IVote {
    approved: number
    declined: number
    closed_at_lh: number
}

export class VoteModel extends Model {

    constructor(state: IVote, options: any){
        super(state, options) 
    }

    get = () => {
        return {
            approved: (): number => this.state.approved,
            declined: (): number => this.state.declined,
            closed_at_lh: (): number => this.state.closed_at_lh,
        }
    }
}