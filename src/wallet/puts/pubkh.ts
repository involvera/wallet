import { Model } from 'acey' 
import { IPubKH } from 'community-coin-types'

const DEFAULT_VALUE: IPubKH = {
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