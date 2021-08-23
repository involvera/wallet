import { Model } from 'acey' 

export interface IValue {
    at_time: number
    now: number
}

export const DEFAULT_VALUE: IValue = {
    at_time: 0,
    now: 0
}

export class ValueModel extends Model {

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