import { Model } from 'acey'
import { 
    IOutput, Output, OutputList,
    IInput, Input, InputList,
} from '.'

import { 
    ByteArrayToInt, 
    Sha256, 
    B64ToByteArray
} from '../util'

export interface ITransaction {
    lh:      Uint8Array
	t:       Uint8Array
	inputs:  IInput[]
	outputs: IOutput[] 
}

export class Transaction extends Model {

    constructor(tx: ITransaction, options: any) {
        super(tx, options)
        this.setState({
            inputs: new InputList(this.state.inputs, this.kids()),
            outputs: new InputList(this.state.outputs, this.kids()),
        })
    }

    getTime = () => B64ToByteArray(this.state.t)
    getTimeInt = () => ByteArrayToInt(this.getTime(), false)

    getInputAt = (idx: number) => this.getInputs().nodeAt(idx) as Input
    getOutputAt = (idx: number) => this.getOutputs().nodeAt(idx) as Output

    getHash = () => Sha256(this.to().string())
    getInputs = (): InputList => this.state.inputs
    getOutputs = (): OutputList => this.state.outputs

    gsLugh = () => this.getInputs().count() == 1 && this.getInputAt(0) && this.getInputAt(0).prevTxHash().length == 0
}

