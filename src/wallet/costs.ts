import { Model } from 'acey'
import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant'

const DEFAULT_STATE = {
    thread: 0, 
    proposal: 0, 
    upvote: 0, 
    reaction_0: 0, 
    reaction_1: 0, 
    reaction_2: 0
}

export default class Costs extends Model {

    constructor(initialState = DEFAULT_STATE, options: any){
        super(initialState, options)
    }

    isSet = (): boolean => this.get().thread() > 0

    get = () => {
        const thread = (): number => this.state.costs.thread
        const proposal = (): number => this.state.costs.proposal
        const upvote = (): number => this.state.costs.upvote
        const reaction0 = (): number => this.state.costs.reaction_0
        const reaction1 = (): number => this.state.costs.reaction_1
        const reaction2 = (): number => this.state.costs.reaction_2

        return { 
            proposal, upvote, thread,
            reaction0, reaction1, reaction2
       }
    }

    fetch = async () => {
        try {
             const res = await fetch(ROOT_API_URL + '/costs', { method: 'GET' })
             res.status == 200 && this.setState(await res.json()).store()
             return res.status
        } catch (e){
             throw new Error(e)
        }
     }


}