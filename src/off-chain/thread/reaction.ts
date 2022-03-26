import { Model } from 'acey'
import { IReactionCount } from 'community-coin-types'

const DEFAULT_STATE: IReactionCount = {
    n_upvote: 0, 
    n_reward_0: 0, 
    n_reward_1: 0,
    n_reward_2: 0
}

export class ReactionModel extends Model{

    static DefaultState: IReactionCount = DEFAULT_STATE

    constructor(state: IReactionCount = DEFAULT_STATE, options: any){
        super(state, options)
    }
    
    get = () => {
        return {
            cumulatedReactionCount: (): number => {
                const { n_reward_0, n_reward_1, n_reward_2, n_upvote } = this.state
                return n_reward_0 + n_reward_1 + n_reward_2 + n_upvote
            },
            countUpvote: (): number => this.state.n_upvote,
            countReward0: (): number => this.state.n_reward_0,
            countReward1: (): number => this.state.n_reward_1,
            countReward2: (): number => this.state.n_reward_2,
        }
    }
}