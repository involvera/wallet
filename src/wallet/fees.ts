import { Model } from 'acey'
import axios from 'axios'
import { ROOT_API_URL } from '../constant'

export default class Fees extends Model {

    constructor(initialState = {fee_per_byte: 0, address: ""}, options: any){
        super(initialState, options)
    }
    
    get = () => {
        const feePerByte = (): number => this.state.fee_per_byte 
        const addressToSend = (): string => this.state.address

        return { feePerByte, addressToSend }
    }

    isSet = () => this.get().feePerByte() > 0

    fetch = async () => {
       try {
            const res = await axios(ROOT_API_URL + '/fees')
            res.status == 200 && this.setState(res.data).store()
            return res.status
       } catch (e){
            throw new Error(e)
       }
    }
}