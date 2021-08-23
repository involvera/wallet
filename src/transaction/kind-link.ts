import { Model } from 'acey'
import { IOutput, OutputModel, DEFAULT_STATE as DEFAULT_STATE_OUTPUT } from './output';

export interface IKindLink {
    tx_id: string
    lh: number
    vout: number
    output: IOutput
    target_content: string
}

export const DEFAULT_STATE: IKindLink = {
    tx_id: '',
    lh: 0,
    vout: 0,
    output: DEFAULT_STATE_OUTPUT,
    target_content: ''
}

export class KindLinkModel extends Model {

    constructor(state: IKindLink = DEFAULT_STATE, options: any){
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
