import { Model } from 'acey'
import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant'

export default class Fees extends Model {

    constructor(initialState = {fee_per_byte: 0, to_pkh_hex: ""}, options: any){
        super(initialState, options)
    }
    
    get = () => {
        const feePerByte = (): number => this.state.fees.fee_per_byte 
        const pubKHToSend = (): string => this.state.to_pkh_hex

        return { feePerByte, pubKHToSend }
    }

    isSet = () => this.get().feePerByte() > 0

    fetch = async () => {
       try {
            const res = await fetch(ROOT_API_URL + '/fees', {
                method: 'GET',
            })
            res.status == 200 && this.setState(await res.json()).store()
            return res.status
       } catch (e){
            throw new Error(e)
       }
    }
}