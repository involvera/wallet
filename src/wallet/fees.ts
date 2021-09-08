import { Model } from 'acey'
import axios from 'axios'
import config from '../config'

export default class FeesModel extends Model {

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
            const res = await axios(config.getRootAPIChainUrl() + '/fees', {
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            res.status == 200 && this.setState(res.data).store()
            return res.status
       } catch (e: any){
            throw new Error(e)
       }
    }
}