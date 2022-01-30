
import axios from 'axios'
import { ICostProposal }  from 'community-coin-types'
import { Model } from 'acey'
import config from '../config'

const DEFAULT_STATE: ICostProposal = {
    thread: 0, 
    proposal: 0, 
    upvote: 0, 
    reaction_0: 0, 
    reaction_1: 0, 
    reaction_2: 0
}

export default class CostsModel extends Model {

    static DefaultState: ICostProposal = DEFAULT_STATE

    constructor(initialState = DEFAULT_STATE, options: any){
        super(initialState, options)
    }

    isSet = (): boolean => this.get().thread() > 0

    get = () => {
        const thread = (): number => this.state.thread
        const proposal = (): number => this.state.proposal
        const upvote = (): number => this.state.upvote
        const reaction0 = (): number => this.state.reaction_0
        const reaction1 = (): number => this.state.reaction_1
        const reaction2 = (): number => this.state.reaction_2

        return {
            proposal, upvote, thread,
            reaction0, reaction1, reaction2
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