import { Model } from 'acey'
import { ICostHistory } from 'community-coin-types'

const DEFAULT_STATE: ICostHistory = {
    proposal_index: 0,
    from_lh: 0,
    validated_at: 0,
    thread_cost: 0,
    proposal_cost: 0
}

export class LastCostChangeModel extends Model{

    static DefaultState: ICostHistory = DEFAULT_STATE

    constructor(state: ICostHistory = DEFAULT_STATE, options: any){
        super(state, options)
    }

    get = () => {
        return {
            proposalIndex: (): number => this.state.proposal_index,
            fromLH: (): number => this.state.from_lh,
            validatedAt: (): number => this.state.validated_at,
            threadCost: (): number => this.state.thread_cost,
            proposalCost: (): number => this.state.proposal_cost
        }
    }
}