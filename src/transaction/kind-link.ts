import { Model } from 'acey'
import { ONCHAIN } from 'community-coin-types'
import { Inv } from 'wallet-util';
import { OutputModel } from './output';

const DEFAULT_STATE: ONCHAIN.IKindLinkUnRaw = {
    tx_id: '',
    lh: 0,
    vout: 0,
    output: OutputModel.DefaultState,
    target_content: ''
}

export class KindLinkModel extends Model {

    static DefaultState: ONCHAIN.IKindLinkUnRaw = DEFAULT_STATE

    constructor(state: ONCHAIN.IKindLinkUnRaw = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            output: new OutputModel(state.output, this.kids())
        })
    }

    get = () => {
        return {
            txID: () => Inv.TxHash.fromHex(this.state.tx_id),
            lh: (): number => this.state.lh,
            vout: (): number => this.state.vout,
            output: (): OutputModel => this.state.output,
            targetContent: (): Inv.PubKH | null => this.state.target_content ? Inv.PubKH.fromHex(this.state.target_content) : null
        }
    }
}
