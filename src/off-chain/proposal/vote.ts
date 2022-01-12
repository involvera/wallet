import { Model } from "acey";
import { formatPercent } from 'wallet-util'
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

    static DefaultState: IVote = DEFAULT_STATE

    constructor(state: IVote = DEFAULT_STATE, options: any){
        super(state, options) 
    }

    is2 = () => {
        const over = (currentLH: number) => this.get().closedAtLH() <= currentLH || (this.get().approved() > 0.5 || this.get().declined() >= 0.5)
        const approved = (currentLH: number) => over(currentLH) && this.get().approved() > 0.5
        const declined = (currentLH: number) => over(currentLH) && this.get().approved() <= 0.5

        return {
            over, declined, approved
        }
    }

    get = () => {
        return {
            approvedPercent: (): number => this.get().approved() * 100,
            approvedPercentPretty: (): string => formatPercent(this.get().approvedPercent()),
            declinedPercent: (): number => this.get().declined() * 100,
            declinedPercentPretty: (): string => formatPercent(this.get().declinedPercent()),
            approved: (): number => this.state.approved,
            declined: (): number => this.state.declined,
            closedAtLH: (): number => this.state.closed_at_lh,
        }
    }
}