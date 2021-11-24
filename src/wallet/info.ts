import { Model } from 'acey'
import axios from 'axios'
import config from '../config'
import { CYCLE_IN_LUGH, LUGH_AMOUNT } from '../constant'
import { IHeaderSignature } from './wallet'

export interface IInfo {
    content_nonce: number;
    balance: number;
    vote_power_count: number;
    rewards_received_270: number;
    position: number
}

const DEFAULT_STATE: IInfo = {
    content_nonce: 0,
    balance: 0,
    vote_power_count: 0,
    rewards_received_270: 0,
    position: 0
}

export default class InfoModel extends Model {

    constructor(initialState = DEFAULT_STATE, options: any){
        super(initialState, options)
    }
    
    iterateTotalContent = (n: number) => this.setState({content_nonce: this.get().contentNonce() + n})

    get = () => {
        const contentNonce = (): number => this.state.content_nonce 
        const balance = (): number => this.state.balance
        const votePowerCount = (): number => this.state.vote_power_count
        const rewardsReceivedLast90D = (): number => this.state.rewards_received_270
        const contributorRank = (): number => this.state.position
        const votePowerPercent = (lh: number): number => {
            const total_vp = Math.min(CYCLE_IN_LUGH, lh) * (LUGH_AMOUNT / 10)
            if (total_vp === 0)
                return 0
            return ((votePowerCount() / 10) / total_vp) * 100
        }

        return { contentNonce, balance, votePowerCount, contributorRank, rewardsReceivedLast90D, votePowerPercent }
    }

    fetch = async (headerSig: IHeaderSignature) => {
       try {
            const res = await axios(config.getRootAPIChainUrl() + '/wallet/info', {
                headers: headerSig as any,
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            res.status == 200 && this.setState(res.data).store()
            return res.status
       } catch (e: any){
            throw new Error(e)
       }
    }
}