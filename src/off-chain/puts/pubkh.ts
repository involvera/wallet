import { Model } from 'acey' 
import { ONCHAIN } from 'community-coin-types'
import { Inv } from 'wallet-util'

const DEFAULT_VALUE: ONCHAIN.IPubKH = {
    sender: '',
    recipient: ''
}

export class PubKHModel extends Model {

    static DefaultState: ONCHAIN.IPubKH = DEFAULT_VALUE

    constructor(state: ONCHAIN.IPubKH, options: any){
        super(state, options)
    }

    get = () => {
        return {
            sender: (): Inv.PubKH | null => this.state.sender ? Inv.PubKH.fromHex(this.state.sender) : null,
            recipient: (): Inv.PubKH | null => this.state.recipient ? Inv.PubKH.fromHex(this.state.recipient) : null
        }
    }
}