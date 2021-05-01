import { Model } from 'acey'
import axios from 'axios'
import config from '../config'
import { IHeaderSignature } from './wallet'

export default class Info extends Model {

    constructor(initialState = {total_content: 0, balance: 0}, options: any){
        super(initialState, options)
    }
    
    get = () => {
        const countTotalContent = (): number => this.state.total_content 
        const balance = (): number => this.state.balance

        return { countTotalContent, balance }
    }

    fetch = async (headerSig: IHeaderSignature) => {
       try {
            const res = await axios(config.getRootAPIUrl() + '/wallet/info', {
                headers: headerSig as any,
                timeout: 10000,
            })
            res.status == 200 && this.setState(res.data).store()
            return res.status
       } catch (e){
            throw new Error(e)
       }
    }
}