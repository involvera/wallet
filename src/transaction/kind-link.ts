import { Model } from 'acey'
import { IKindLinkUnRaw } from 'community-coin-types'
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
            txID: (): string => this.state.tx_id,
            lh: (): number => this.state.lh,
            vout: (): number => this.state.vout,
            output: (): OutputModel => this.state.output,
            targetContent: (): string => this.state.target_content
        }
    }
}
