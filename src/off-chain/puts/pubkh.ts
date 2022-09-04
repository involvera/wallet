import { Model } from 'acey' 
import { IPubKH } from 'community-coin-types'
import { Inv } from 'wallet-util'

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
            sender: (): Inv.PubKH | null => this.state.sender ? Inv.PubKH.fromHex(this.state.sender) : null,
            recipient: (): Inv.PubKH | null => this.state.recipient ? Inv.PubKH.fromHex(this.state.recipient) : null
        }
    }
}