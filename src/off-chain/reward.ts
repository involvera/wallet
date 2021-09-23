import axios from 'axios'
import { Collection, Model } from "acey";
import config from '../config';
import { IAlias, AliasModel } from './alias'

export type TReward = 'upvote' | 'reward_0' | 'reward_1' | 'reward_2'

export interface IReward {
    sid: number
    tx_id: string
    vout: number
    category?: TReward
    author?: IAlias
    target_pkh?: string
    created_at?: Date
}

export const DEFAULT_STATE: IReward = {
    sid: 0,
    tx_id: '',
    vout: -1,
}

export class RewardModel extends Model {

    static NewContent = (sid: number, tx_id: string, vout: number): RewardModel => {
        return new RewardModel({sid, tx_id, vout} as any, {})
    }

    constructor(state: IReward = DEFAULT_STATE, options: any){
        super(state, options) 
        !!state.author && this.setState({ author: new AliasModel(state.author,this.kids()) })
    }

    get = () => {
        return {
            sid: (): number => this.state.sid,
            category: (): TReward => this.state.category,
            txID: (): string => this.state.tx_id,
            vout: (): string => this.state.vout,
            author: (): AliasModel => this.state.author,
            targetPKH: (): string => this.state.target_pkh,
            created_at: (): Date => this.state.created_at
        }
    }

    broadcast = async () => {
        const json = this.to().plain()
        try {
            const res = await axios(`${config.getRootAPIOffChainUrl()}/reward`, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(json),
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            res.status == 201 && this.hydrate(res.data)
            return res
        } catch (e: any) {
            return e.toString()
        }
    }
}

export class RewardCollection extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [RewardModel, RewardCollection], options)
    }
}