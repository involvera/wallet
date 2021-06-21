import { Model } from 'acey'
import axios from 'axios'
import config from '../config'
import { IHeaderSignature } from './wallet'

export default class Info extends Model {

    constructor(initialState = {total_content: 0, balance: 0}, options: any){
        super(initialState, options)
    }
    
    iterateTotalContent = (n: number) => this.setState({content_nonce: this.get().contentNonce() + n})

    get = () => {
        const contentNonce = (): number => this.state.content_nonce 
        const balance = (): number => this.state.balance

        return { contentNonce, balance }
    }

    fetch = async (headerSig: IHeaderSignature) => {
       try {
            const res = await axios(config.getRootAPIChainUrl() + '/wallet/info', {
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