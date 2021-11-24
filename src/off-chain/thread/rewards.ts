import { Model } from 'acey'

export interface IRewards {
    n_upvote: number
    n_reward_0: number 
    n_reward_1: number
    n_reward_2: number
}

export const DEFAULT_STATE: IRewards = {
    n_upvote: 0, 
    n_reward_0: 0, 
    n_reward_1: 0,
    n_reward_2: 0
}

export class RewardsModel extends Model{
    constructor(state: IRewards = DEFAULT_STATE, options: any){
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