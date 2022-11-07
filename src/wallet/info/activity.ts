import { Model } from 'acey' 
import { ONCHAIN } from 'community-coin-types'

const DEFAULT_VALUE: ONCHAIN.IUserActivity = {
    activity: [],
    last_lugh_height: 0
}

export default class UserActivityModel extends Model {

    static DefaultState: ONCHAIN.IUserActivity = DEFAULT_VALUE

    constructor(state: ONCHAIN.IUserActivity, options: any){
        super(state, options)
    }

    get = () => {
        return {
            activity: (): number[] => this.state.activity,
            lastLughHeight: (): number => this.state.last_lugh_height
        }
    }
}