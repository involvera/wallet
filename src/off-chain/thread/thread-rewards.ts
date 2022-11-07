import { Model } from 'acey'
import { ONCHAIN } from 'community-coin-types'
import { Inv } from 'wallet-util'
import { RewardCountModel } from './reward'

const DEFAULT_STATE: ONCHAIN.IThreadReward = {
    thread_pkh: '',
    reward_count: RewardCountModel.DefaultState,
    user_reward_count: RewardCountModel.DefaultState,
}

export class ThreadRewardModel extends Model{

    static DefaultState: ONCHAIN.IThreadReward = DEFAULT_STATE

    constructor(state: ONCHAIN.IThreadReward = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            reward_count: new RewardCountModel(state.reward_count, this.kids()),
            user_reward_count: new RewardCountModel(state.user_reward_count, this.kids())
        })
    }
    
    get = () => {
        return {
            threadPKH: (): Inv.PubKH => Inv.PubKH.fromHex(this.state.thread_pkh),
            threadReward: (): RewardCountModel => this.state.reward_count,
            userReward: (): RewardCountModel => this.state.user_reward_count,
        }
    }
}