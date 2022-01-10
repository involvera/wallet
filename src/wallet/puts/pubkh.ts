import { Model } from 'acey' 

export interface IPubKH {
    sender: string
    recipient: string
}

export const DEFAULT_VALUE: IPubKH = {
    sender: '',
    recipient: ''
}

export class PubKHModel extends Model {

    static DefaultState: IPubKH = DEFAULT_VALUE

    constructor(state: IPubKH, options: any){
        super(state, options)
    }

    get = () => {
        return {
            sender: (): string => this.state.sender,
            recipient: (): string => this.state.recipient
        }
    }
}