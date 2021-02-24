import { Collection, Model } from 'acey'

export interface IInput {
    prev_transaction_hash: string
    vout: number
    sign: string
}

export class Input extends Model {

    constructor(input: IInput, options: any) {
        super(input, options)
    }

    get = () => {
        const prevTxHash = (): string => this.state.prev_transaction_hash
        const vout = (): number => this.state.vout

        return { vout, prevTxHash }
    }
}

export class InputList extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [Input, InputList], options)
    }
}