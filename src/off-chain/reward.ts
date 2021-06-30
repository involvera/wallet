import axios from 'axios'
import { Collection, Model } from "acey";
import { IAuthor } from './interfaces';
import config from '../config';

export class Reward extends Model {

    static NewContent = (sid: number, tx_id: string, vout: number): Reward => {
        return new Reward({sid, tx_id, vout} as any, {})
    }

    constructor(state: any, options: any){
        super(state, options) 
    }

    get = () => {
        return {
            sid: (): number => this.state.sid,
            category: (): 0 | 1 | 2 | 3 => this.state.category,
            txID: (): string => this.state.tx_id,
            vout: (): string => this.state.vout,
            author: (): IAuthor => this.state.author,
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
            res.status == 201 && this.setState(res.data)
            return res
        } catch (e) {
            return e.toString()
        }
    }
}

export class RewardList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Reward, RewardList], options)
    }
}