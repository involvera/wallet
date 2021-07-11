import { Model } from 'acey'
import axios from 'axios'
import config from '../config'
import { Constitution as C } from 'wallet-script'
import { IConstitutionData } from './interfaces'

export const DEFAULT_STATE: IConstitutionData = {
    proposal: {
        origin: {
            tx_id: '',
            vout: -1
        },
        pubkh: '',
        content_nonce: -1
    },
    constitution: [] 
}

export default class Constitution extends Model {

    constructor(initialState = DEFAULT_STATE, options: any){
        super(initialState, options)
    }

    get = () => {
        const constitution = (): C.TConstitution => this.state.constitution
        const pubKHOrigin = (): string | null => {
            if (this.state.proposal){
                return this.state.proposal.pubkh
            }
            return null
        }
        return {
            constitution, pubKHOrigin
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
             res.status == 200 && this.setState(res.data).store()
             return res.status
        } catch (e){
             throw new Error(e)
        }
     }
}