import { Collection, Model } from 'acey'
import { Inv } from 'wallet-util'

export interface IContributorStats { 
    content_nonce: number
    balance: number
    vote_power_count: number
    rewards_received_270: number
    position: number
    addr: string
    sid: number
}

const DEFAULT_STATE: IContributorStats = {
    content_nonce: 0,
    balance: 0,
    vote_power_count: 0,
    rewards_received_270: 0,
    position: 0,
    addr: "",
    sid: 0
}

export class ContributorModel extends Model {

    static DefaultState: IContributorStats = DEFAULT_STATE

    constructor(state: IContributorStats = DEFAULT_STATE, options: any){
        super(state, options)
    }

    reset = () => this.setState(DEFAULT_STATE)

    get = () => {
        return {
            addr: (): Inv.Address | null => this.state.addr ? new Inv.Address(this.state.addr) : null,
            position: (): number => this.state.position,
            sid: (): number => this.state.sid,
            contentNonce: (): number => this.state.content_nonce,
            votePowerCount: (): Inv.InvBigInt => new Inv.InvBigInt(this.state.vote_power_count),
            rewardsReceivedLast3Months: (): Inv.InvBigInt => new Inv.InvBigInt(this.state.rewards_received_270),
            balance: (): Inv.InvBigInt  => new Inv.InvBigInt(this.state.balance)
        }
    }

}

export class ContributorCollection extends Collection {
    constructor(state: IContributorStats[] = [], options: any){
        super(state, [ContributorModel, ContributorCollection], options)
    }

    findByAddress = (addr: Inv.Address): ContributorModel | undefined => {
        return this.find({ addr: addr.get() }) as ContributorModel | undefined
    }

    reset = () => this.setState([])
}