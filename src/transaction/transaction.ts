import { Model } from 'acey'
import { 
    IOutput, Output, OutputList,
    IInput, Input, InputList,
} from '.'
import { PUBKH_LENGTH } from '../constant'
import { wallet } from '../models'

import { ByteArrayToInt, Sha256, B64ToByteArray, StringToByteArray } from '../util'
import { UTXO, UTXOList } from './utxo'

export interface ITransaction {
    lh:      string
	t:       number
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

    isLugh = () => this.get().inputs().count() == 1 && this.get().inputs().nodeAt(0) && (this.get().inputs().nodeAt(0) as Input).get().prevTxHash().length == 0

    sign = async (utxos: UTXOList) => {
        await utxos.fetchPrevTxList(wallet.sign().header())
        const inputs = this.get().inputs()

        for (let i = 0; i < inputs.count(); i++){
            const prevTx = (utxos.nodeAt(i) as UTXO).get().tx() as Transaction
            const signature = wallet.sign().value(Buffer.from(prevTx.to().string()))
            const input = this.get().inputs().nodeAt(i) as Input
            input.setState({ sign: Buffer.from(signature).toString('hex') })
        }
    }

    get = () => {
        const time = (): number => this.state.t

        const hash = () => Sha256(this.to().string())
        const inputs = (): InputList => this.state.inputs
        const outputs = (): OutputList => this.state.outputs

        return {
            time,
            hash, inputs, outputs
        }
    }
}

