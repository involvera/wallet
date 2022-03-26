import { Model } from 'acey'
import { IThreadReward } from 'community-coin-types'
import { ReactionModel } from './reaction'

const DEFAULT_STATE: IThreadReward = {
    thread_pkh: '',
    reaction_count: ReactionModel.DefaultState,
    user_reaction_count: ReactionModel.DefaultState,
}

export class ThreadReactionModel extends Model{

    static DefaultState: IThreadReward = DEFAULT_STATE

    constructor(state: IThreadReward = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            reaction_count: new ReactionModel(state.reaction_count, this.kids()),
            user_reaction_count: new ReactionModel(state.user_reaction_count, this.kids())
        })
    }
    
    get = () => {
        return {
            threadPKH: (): string => this.state.thread_pkh,
            userReaction: (): ReactionModel => this.state.user_reaction_count,
            threadReaction: (): ReactionModel => this.state.reaction_count
        }
    }
}