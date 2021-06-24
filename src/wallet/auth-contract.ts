import { Model } from 'acey'
import axios from 'axios'
import config from '../config'

export default class AuthContract extends Model {

    constructor(initialState: any = {next_change: 0, value: ""}, options: any) {
        super(initialState, options)
    }

    get = () => {
        const nextChange = (): number => this.state.next_change
        const value = (): string => this.state.value
        return { value, nextChange }
    }

    isExpired = () => !(new Date(this.get().nextChange() * 1000) > new Date())
    
    fetch = async () => {
        try {
            const res = await axios(config.getRootAPIChainUrl() + '/contract', { 
                method: 'GET',
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
             })
            res.status == 200 && this.setState( res.data ).store()
            return res.status
        } catch(e){
            throw new Error(e);
        }            
    }
    refresh = async () => this.isExpired() && await this.fetch()
    reset = () => this.setState({ value: "", next_change: 0 })
}
