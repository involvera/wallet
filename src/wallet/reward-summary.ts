import { Model, Collection } from 'acey'
import axios from 'axios'
import { IHeaderSignature } from './'
import config from '../config'

interface IRewardSummary {
    value: number
    reaction_count: number
    last_at: number
    thread_pkh: string
}

const DEFAULT_STATE: IRewardSummary = {
    value: 0,
    reaction_count: 0,
    last_at: 0,
    thread_pkh: ''
}

export class RewardSummaryModel extends Model {

    constructor(state: IRewardSummary = DEFAULT_STATE, options: any){
        super(state, options)
    }

    get = () => {
        return {
            value: (): number => this.state.value,
            reactionCount: (): number => this.state.reaction_count,
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
        let countAdded = 0 
        for (const pubkh in json){
            const obj = Object.assign({}, json[pubkh], {thread_pkh: pubkh})
            delete obj['recipient']
            const idx = this.indexOf({thread_pkh: pubkh})
            if (idx == -1) 
                this.push(obj) && countAdded++
            else 
                this.updateAt(obj, idx)
        }
        countAdded > 0 && this.action().store()
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
    
    fetch = async (afterTime: number, header: IHeaderSignature) => {
        try {
            const response = await axios(config.getRootAPIChainUrl() + '/puts/rewards/collection', {
                headers: Object.assign({}, header, {
                    from_time: afterTime.toString()
                })
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