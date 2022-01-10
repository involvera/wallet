import { Model, Collection } from 'acey'
import axios from 'axios'
import { IHeaderSignature } from '../wallet'
import config from '../config'
import { IRewards, DEFAULT_STATE as DEFAULT_STATE_REWARDS, RewardsModel } from '../off-chain/thread/rewards'

export interface IRewardSummary {
    value: number
    reaction_count: IRewards
    last_at: number
    thread_pkh: string
}

export const DEFAULT_STATE: IRewardSummary = {
    value: 0,
    reaction_count: DEFAULT_STATE_REWARDS,
    last_at: 0,
    thread_pkh: ''
}

export class RewardSummaryModel extends Model {

    static DefaultState: IRewardSummary = DEFAULT_STATE

    constructor(state: IRewardSummary = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            reaction_count: new RewardsModel(state.reaction_count, this.kids())
        })
    }

    get = () => {
            return {
            value: (): number => this.state.value,
            reactionCount: (): RewardsModel => this.state.reaction_count,
            threadPKH: (): string => this.state.thread_pkh,
            lastReactionTime: (): number => this.state.last_at
        }
    }
}

export class RewardSummaryCollection extends Collection {

    constructor(state: IRewardSummary[], options: any){
        super(state, [RewardSummaryModel, RewardSummaryCollection], options)
    }

    private _handleJSONResponse = (json: any) => {
        for (const pubkh in json){
            const obj = Object.assign({}, json[pubkh], {thread_pkh: pubkh})
            delete obj['recipient']
            const idx = this.findIndex({thread_pkh: pubkh})
            if (idx == -1) {
                this.push(obj)
            } else {
                this.updateAt(obj, idx)
            }
        }
        this.action().store()
    }

    get = () => {

        const getLastReactionTime = () => {
            const r = this.orderBy('last_at', 'desc').first() as RewardSummaryModel
            if (!r)
                return 0
            return r.get().lastReactionTime()
        }

        return {
            getLastReactionTime
        }
    }
    
    fetch = async (afterTime: number, pubkeyHash: string) => {
        try {
            const response = await axios(config.getRootAPIChainUrl() + '/puts/rewards/user/collection', {
                headers: {
                    from_time: afterTime.toString(),
                    pubkey: pubkeyHash
                }
            })
            if (response.status == 200){
                this._handleJSONResponse(response.data)
                return response.status
            }
        } catch(e) {
            throw new Error(e)
        }
    }
}