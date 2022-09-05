import { Model } from 'acey'
import { ICostHistory } from 'community-coin-types'
import { Inv } from 'wallet-util'

const DEFAULT_STATE: ICostHistory = {
    proposal_index: 0,
    from_lh: 0,
    validated_at_time: 0,
    validated_at_tx_height: 0,
    thread_cost: 0,
    proposal_cost: 0
}

export class LastCostChangeModel extends Model{

    static DefaultState: ICostHistory = DEFAULT_STATE

    constructor(state: ICostHistory = DEFAULT_STATE, options: any){
        super(state, options)
    }

    reset = () => this.setState(DEFAULT_STATE)
    
    get = () => {
        return {
            proposalIndex: (): number => this.state.proposal_index,
            fromLH: (): number => this.state.from_lh,
            validatedAtTime: (): number => this.state.validated_at_time,
            validatedAtTxHeight: (): Inv.InvBigInt => new Inv.InvBigInt(this.state.validated_at_tx_height),
            threadCost: (): Inv.InvBigInt => new Inv.InvBigInt(this.state.thread_cost),
            proposalCost: (): Inv.InvBigInt  => new Inv.InvBigInt(this.state.proposal_cost)
        }
    }
}