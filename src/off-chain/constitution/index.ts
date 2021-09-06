import { Model } from 'acey'
import axios from 'axios'
import config from '../../config'
import { Constitution as C } from 'wallet-script'
import { IScriptProposal, ProposalScriptModel, DEFAULT_STATE as PSCRIPT_DEFAULT_STATE } from '../proposal-script'
import { RuleCollection } from './rule'

export interface IConstitutionData {
    proposal: IScriptProposal
    constitution: C.TConstitution
}

export const DEFAULT_STATE: IConstitutionData = {
    proposal: PSCRIPT_DEFAULT_STATE,
    constitution: [] 
}

export class ConstitutionModel extends Model {

    private _setNestedModel = (state: IConstitutionData) => {
        if (state){
            this.setState({
                proposal: new ProposalScriptModel(state.proposal, this.kids()),
                constitution: new RuleCollection(state.constitution, this.kids())
            })
            return true
        }
        return false
    }

    constructor(state = DEFAULT_STATE, options: any){
        super(state, options)
        this._setNestedModel(state)
    }

    get = () => {
        return {
            constitution: (): RuleCollection => this.state.constitution,
            proposalScript: (): ProposalScriptModel => this.state.proposal
        }
    }

    fetch = async () => {
        try {
             const res = await axios(config.getRootAPIChainUrl() + '/constitution', { 
                method: 'GET',
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
             res.status == 200 && this._setNestedModel(res.data) && this.action().store()
             return res.status
        } catch (e){
             throw new Error(e)
        }
     }
}