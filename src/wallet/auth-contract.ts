import { Model } from 'acey'
import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant'

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
            const res = await fetch(ROOT_API_URL + '/contract', { method: 'GET' })
            res.status == 200 && this.setState( await res.json() ).store()
            return res.status
        } catch(e){
            throw new Error(e);
        }            
    }
    refresh = async () => this.isExpired() && await this.fetch()
    reset = () => this.setState({ value: "", next_change: 0 })
}
