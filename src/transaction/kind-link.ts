import { Model } from 'acey'
import { IKindLinkUnRaw } from 'community-coin-types'
import { Inv } from 'wallet-util';
import { OutputModel } from './output';

const DEFAULT_STATE: IKindLinkUnRaw = {
    tx_id: '',
    lh: 0,
    vout: 0,
    output: OutputModel.DefaultState,
    target_content: ''
}

export class KindLinkModel extends Model {

    static DefaultState: IKindLinkUnRaw = DEFAULT_STATE

    constructor(state: IKindLinkUnRaw = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            output: new OutputModel(state.output, this.kids())
        })
    }

    get = () => {
        return {
            txID: () => new Inv.TxHash(this.state.tx_id),
            lh: (): number => this.state.lh,
            vout: (): number => this.state.vout,
            output: (): OutputModel => this.state.output,
            targetContent: (): Inv.PubKH | null => this.state.target_content ? new Inv.PubKH(this.state.target_content) : null
        }
    }
}
