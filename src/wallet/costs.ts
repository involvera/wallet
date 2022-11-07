
import axios from 'axios'
import { ONCHAIN }  from 'community-coin-types'
import { Model } from 'acey'
import config from '../config'
import { Inv } from 'wallet-util'

const DEFAULT_STATE: ONCHAIN.ICostProposal = {
    thread: 0, 
    proposal: 0, 
    upvote: 0, 
    reward0: 0, 
    reward1: 0, 
    reward2: 0
}

export default class CostsModel extends Model {

    static DefaultState: ONCHAIN.ICostProposal = DEFAULT_STATE

    constructor(initialState = DEFAULT_STATE, options: any){
        super(initialState, options)
    }

    isSet = (): boolean => this.get().thread().gt(0)

    get = () => {
        const thread = () => new Inv.InvBigInt(this.state.thread)
        const proposal = () => new Inv.InvBigInt(this.state.proposal)
        const upvote = () => new Inv.InvBigInt(this.state.upvote)
        const reward0 = () => new Inv.InvBigInt(this.state.reward0)
        const reward1 = () => new Inv.InvBigInt(this.state.reward1)
        const reward2 = () => new Inv.InvBigInt(this.state.reward2)

        return {
            proposal, upvote, thread,
            reward2, reward1, reward0
        }
    }

    fetch = async () => {
        try {
             const res = await axios(config.getRootAPIChainUrl() + '/costs', { 
                method: 'GET',
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