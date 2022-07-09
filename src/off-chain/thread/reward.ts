import { Model } from 'acey'
import { IRewardCount } from 'community-coin-types'

const DEFAULT_STATE: IRewardCount = {
    n_upvote: 0, 
    n_reward0: 0, 
    n_reward1: 0,
    n_reward2: 0
}

export class RewardCountModel extends Model{

    static DefaultState: IRewardCount = DEFAULT_STATE

    constructor(state: IRewardCount = DEFAULT_STATE, options: any){
        super(state, options)
    }

    reset = () => this.setState(DEFAULT_STATE)

    incrementUpvote = () => this.setState({n_upvote: this.get().countUpvote() + 1})
    incrementReward0 = () => this.setState({n_reward0: this.get().countReward0() + 1})
    incrementReward1 = () => this.setState({n_reward1: this.get().countReward1() + 1})
    incrementReward2 = () => this.setState({n_reward2: this.get().countReward2() + 1})

    decrementUpvote = () => this.setState({n_upvote: this.get().countUpvote() - 1})
    decrementReward0 = () => this.setState({n_reward0: this.get().countReward0() - 1})
    decrementReward1 = () => this.setState({n_reward1: this.get().countReward1() - 1})
    decrementReward2 = () => this.setState({n_reward2: this.get().countReward2() - 1})
    
    get = () => {
        return {
            cumulatedRewardCount: (): number => {
                const { n_reward0, n_reward1, n_reward2, n_upvote } = this.state
                return n_reward2 + n_reward1 + n_reward0 + n_upvote
            },
            countUpvote: (): number => this.state.n_upvote,
            countReward0: (): number => this.state.n_reward0,
            countReward1: (): number => this.state.n_reward1,
            countReward2: (): number => this.state.n_reward2,
        }
    }
}