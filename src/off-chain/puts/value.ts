import { Model } from 'acey' 
import { IValue } from 'community-coin-types'
import { Inv } from 'wallet-util'

const DEFAULT_VALUE: IValue = {
    at_time: 0,
    now: 0
}

export default class ValueModel extends Model {

    static DefaultState: IValue = DEFAULT_VALUE

    constructor(state: IValue, options: any){
        super(state, options)
    }

    get = () => {
        return {
            atCreationTime: () => new Inv.InvBigInt(this.state.at_time),
            now: () => new Inv.InvBigInt(this.state.now)
        }
    }

}