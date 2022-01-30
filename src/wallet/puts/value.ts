import { Model } from 'acey' 
import { IValue } from 'community-coin-types'

const DEFAULT_VALUE: IValue = {
    at_time: 0,
    now: 0
}

export class ValueModel extends Model {

    static DefaultState: IValue = DEFAULT_VALUE

    constructor(state: IValue, options: any){
        super(state, options)
    }

    get = () => {
        return {
            atCreationTime: (): number => this.state.at_time,
            now: (): number => this.state.now
        }
    }

}