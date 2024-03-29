import { Model } from 'acey'
import axios from 'axios'
import config from '../../config'
import { OFFCHAIN} from 'community-coin-types'
import { ProposalModel } from '../proposal'
import { RuleCollection } from './rule'


const DEFAULT_STATE: OFFCHAIN.IConstitutionData = {
    proposal: ProposalModel.DefaultState,
    constitution: [] 
}

export class ConstitutionModel extends Model {

    static DefaultState: OFFCHAIN.IConstitutionData = DEFAULT_STATE

    private _setNestedModel = (state: OFFCHAIN.IConstitutionData) => {
        if (state){
            this.setState({
                proposal: state.proposal ? new ProposalModel(state.proposal, this.kids()) : null,
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
                headers: {
                    'content-type': 'application/json'
                },
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