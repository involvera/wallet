import { Model } from "acey";
import { IVoteSummary } from 'community-coin-types'
import { formatPercent } from 'wallet-util'

const DEFAULT_STATE: IVoteSummary = {
    approved: -1,
    declined: -1,
    closed_at_lh: 0
}

export class VoteModel extends Model {

    static DefaultState: IVoteSummary = DEFAULT_STATE

    constructor(state: IVoteSummary = DEFAULT_STATE, options: any){
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
            approvedPercentPretty: (): string => {
                const percent = this.get().approvedPercent()
                return percent < 1 ? '<1%' : formatPercent(this.get().approvedPercent())
            },
            declinedPercent: (): number => this.get().declined() * 100,
            declinedPercentPretty: (): string => {
                const percent = this.get().declinedPercent()
                return percent < 1 ? '<1%' : formatPercent(this.get().declinedPercent())
            },
            approved: (): number => this.state.approved,
            declined: (): number => this.state.declined,
            closedAtLH: (): number => this.state.closed_at_lh,
        }
    }
}