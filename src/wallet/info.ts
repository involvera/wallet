import { Model } from 'acey'
import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant'
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
            const res = await fetch(ROOT_API_URL + '/wallet/info', {
                method: 'GET',
                headers: headerSig as any
            })
            res.status == 200 && this.setState(await res.json()).store()
            return res.status
       } catch (e){
            throw new Error(e)
       }
    }
}