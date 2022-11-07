import { Model } from "acey";
import { ONCHAIN } from 'community-coin-types'
import { Util } from 'wallet-util'

const { 
    FormatVPPercent
} = Util
 
const DEFAULT_STATE: ONCHAIN.IVoteSummary = {
    approved: -1,
    declined: -1,
    closed_at_lh: 0
}

export class VoteModel extends Model {

    static DefaultState: ONCHAIN.IVoteSummary = DEFAULT_STATE

    constructor(state: ONCHAIN.IVoteSummary = DEFAULT_STATE, options: any){
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
                return percent < 1 ? '<1%' : FormatVPPercent(this.get().approvedPercent())
            },
            declinedPercent: (): number => this.get().declined() * 100,
            declinedPercentPretty: (): string => {
                const percent = this.get().declinedPercent()
                return percent < 1 ? '<1%' : FormatVPPercent(this.get().declinedPercent())
            },
            approved: (): number => this.state.approved,
            declined: (): number => this.state.declined,
            closedAtLH: (): number => this.state.closed_at_lh,
        }
    }
}