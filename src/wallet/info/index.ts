import { Model } from 'acey'
import { UserActivityModel } from './activity'
import axios from 'axios'
import { IWalletInfo } from 'community-coin-types'
import { formatPercent } from 'wallet-util'
import config from '../../config'
import { CYCLE_IN_LUGH, LUGH_AMOUNT } from '../../constant'

const DEFAULT_STATE: IWalletInfo = {
    content_nonce: 0,
    balance: 0,
    vote_power_count: 0,
    rewards_received_270: 0,
    position: 0,
    activity: UserActivityModel.DefaultState
}

export class InfoModel extends Model {

    static DefaultState: IWalletInfo = DEFAULT_STATE

    static fetch = async (userPubKH: string) => {
        try {
             const res = await axios(config.getRootAPIChainUrl() + '/wallet/' + userPubKH, {
                 timeout: 10000,
                 validateStatus: function (status) {
                     return status >= 200 && status < 500;
                 },
             })
             if (res.status == 200)
                return new InfoModel(res.data, {})
            return null
        } catch (e: any){
             throw new Error(e)
        }
     }

    constructor(initialState = DEFAULT_STATE, options: any){
        super(initialState, options)
        this.setState({
            activity: new UserActivityModel(initialState.activity, this.kids())
        })
    }
    
    iterateTotalContent = (n: number) => this.setState({content_nonce: this.get().contentNonce() + n})

    get = () => {
        const contentNonce = (): number => this.state.content_nonce 
        const balance = (): number => this.state.balance
        const votePowerCount = (): number => this.state.vote_power_count
        const rewardsReceivedLast90D = (): number => this.state.rewards_received_270
        const contributorRank = (): number => this.state.position
        const activity = (): UserActivityModel => this.state.activity
        
        const votePowerPercent = (lh: number): number => {
            const total_vp = Math.min(CYCLE_IN_LUGH, lh) * (LUGH_AMOUNT / 10)
            if (total_vp === 0)
                return 0
            return ((votePowerCount() / 10) / total_vp) * 100
        }

        const votePowerPercentPretty = (lh: number): string => {
            return formatPercent(votePowerPercent(lh))
        }

        return { 
            activity, contentNonce, balance, votePowerCount, 
            contributorRank, rewardsReceivedLast90D, votePowerPercent,
            votePowerPercentPretty
        }
    }
}