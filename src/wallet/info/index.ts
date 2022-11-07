import { Model } from 'acey'
import UserActivityModel from './activity'
import axios from 'axios'
import { ONCHAIN } from 'community-coin-types'
import { Inv, Util } from 'wallet-util'
import config from '../../config'
import { CYCLE_IN_LUGH, LUGH_AMOUNT } from '../../constant'

const DEFAULT_STATE: ONCHAIN.IWalletInfo = {
    content_nonce: 0,
    balance: 0,
    vote_power_count: 0,
    rewards_received_270: 0,
    position: 0,
    activity: UserActivityModel.DefaultState
}

export default class InfoModel extends Model {

    static DefaultState: ONCHAIN.IWalletInfo = DEFAULT_STATE

    static fetch = async (userPubKH: Inv.PubKH) => {
        try {
             const res = await axios(config.getRootAPIChainUrl() + '/wallet/' + userPubKH.hex(), {
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
    
    iterateTotalContent = (n: number) => this.setState({content_nonce: this.get().contentNonce().number() + n})

    get = () => {
        const contentNonce = (): Inv.InvBigInt => new Inv.InvBigInt(this.state.content_nonce) 
        const balance = () => new Inv.InvBigInt(this.state.balance)
        const votePowerCount = () => new Inv.InvBigInt(this.state.vote_power_count)
        const rewardsReceivedLast90D = () => new Inv.InvBigInt(this.state.rewards_received_270)
        const contributorRank = (): number => this.state.position
        const activity = (): UserActivityModel => this.state.activity
        
        const votePowerPercent = (lh: number): number => {

            
            const total_vp = Math.min(CYCLE_IN_LUGH, lh) * (LUGH_AMOUNT.number() / 10)
            if (total_vp === 0)
                return 0
            return ((votePowerCount().number() / 10) / total_vp) * 100
        }

        const votePowerPercentPretty = (lh: number): string => Util.FormatVPPercent(votePowerPercent(lh))

        return { 
            activity, contentNonce, balance, votePowerCount, 
            contributorRank, rewardsReceivedLast90D, votePowerPercent,
            votePowerPercentPretty
        }
    }
}