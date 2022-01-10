import { Model } from 'acey'
import axios from 'axios'
import config from '../../config'
import { Constitution as C } from 'wallet-script'
import { DEFAULT_STATE as PROPOSAL_DEFAUL_STATE, IProposal, ProposalModel } from '../proposal'
import { RuleCollection } from './rule'

export interface IConstitutionData {
    proposal: IProposal
    constitution: C.TConstitution
}

export const DEFAULT_STATE: IConstitutionData = {
    proposal: PROPOSAL_DEFAUL_STATE,
    constitution: [] 
}

export class ConstitutionModel extends Model {

    static DefaultState: IConstitutionData = DEFAULT_STATE

    private _setNestedModel = (state: IConstitutionData) => {
        if (state){
            this.setState({
                proposal: Model._isObject(state.proposal) ? new ProposalModel(state.proposal, this.kids()) : null,
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
            proposal: (): ProposalModel | null => this.state.proposal
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
        } catch (e: any){
             throw new Error(e)
        }
     }
}