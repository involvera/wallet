import axios from 'axios'
import { ITransactionUnRaw, ITransactionRaw, IOutputRaw, IInputRaw } from 'community-coin-types'
import { Collection, Model } from 'acey'
import { Inv, Lib } from 'wallet-util'

import { OutputCollection, OutputModel } from './output'
import { InputModel, InputCollection } from './input'
import WalletModel from '../wallet/wallet'
import config from '../config'

const {
    Sha256
} = Lib.Hash

const DEFAULT_STATE: ITransactionUnRaw = {
    lh: 0,
    t: 0,
    inputs: [],
    outputs: []
}

export class TransactionModel extends Model {

    static DefaultState: ITransactionUnRaw = DEFAULT_STATE

    static FetchTX = async (hash: string) => {
        const response = await axios(config.getRootAPIChainUrl() + '/transaction/' + hash, {
            timeout: 10000,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            },
        })
        if (response.status == 200){
            const json = response.data
            return new TransactionModel(json, {})
        }
        throw new Error(response.data)
    }

    constructor(tx: ITransactionUnRaw = DEFAULT_STATE, options: any) {
        super(tx, options)
        this.setState({
            inputs: new InputCollection(this.state.inputs, this.kids()),
            outputs: new OutputCollection(this.state.outputs, this.kids()),
        })
    }

    size = () => {
        const raw = this.toRaw().default()
        let size = raw.lh.length
        size += raw.t.length
        size += this.get().inputs().size()
        size += this.get().outputs().size()
        return size
    }

    broadcast = async (wallet: WalletModel) => {
        try {
            const response = await axios(config.getRootAPIChainUrl() + '/transaction', {
                method: 'POST',
                headers: Object.assign(wallet.sign().header() as any, {'content-type': 'application/json' }),
                data: this.toRaw().base64(),
                timeout: 15000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (response.status === 201){
                const { transaction: {lh, t}, utxos } = response.data
                this.setState({lh, t})
                wallet.info().iterateTotalContent(this.get().outputs().countContent())
                wallet.utxos().get().removeUTXOsFromInputs(this.get().inputs())
                wallet.utxos().get().append(utxos || []).store()
            }
            return response
        } catch (e: any){
            throw new Error(e)
        }
    }

    isLugh = () => this.get().inputs().count() == 1 && this.get().inputs().nodeAt(0) && (this.get().inputs().nodeAt(0) as InputModel).get().prevTxHash()?.length() == 0

    get = () => {
        const time = () => Inv.InvBigInt.fromNumber(this.state.t)
        const lughHeight = () => Inv.InvBigInt.fromNumber(this.state.lh)
        const hash = () => new Inv.TxHash(Sha256(this.to().string()))
        const inputs = (): InputCollection => this.state.inputs
        const outputs = (): OutputCollection => this.state.outputs

        const billedSize = (): number => {
            let size = this.size()
            size -= this.get().inputs().size()

            const countInputs = this.get().inputs().count()
            const scriptSize = countInputs + (countInputs * Inv.PubKey.LENGTH) + (countInputs * Inv.Signature.LENGTH_MAX) + (countInputs * 2)
            const voutSize = countInputs * 4
            const prevTxHashSize = countInputs * Inv.TxHash.LENGTH

            const billedInputsSize = scriptSize + voutSize + prevTxHashSize
            size += billedInputsSize

            return size
        }

        const fees = (feePerByte: number): number => {
            return billedSize() * feePerByte
        }

        return {
            time, lughHeight,
            hash, inputs, outputs,
            billedSize,
            fees,
        }
    }

    toRaw = () => {
        const def = (): ITransactionRaw => {
            let inputs: IInputRaw[] = []
            let outputs: IOutputRaw[] = []
    
            for (let i = 0; i < this.get().inputs().count(); i++){
                const input = this.get().inputs().nodeAt(i) as InputModel 
                inputs.push(input.toRaw().default())
            }
    
            for (let i = 0; i < this.get().outputs().count(); i++){
                const output = this.get().outputs().nodeAt(i) as OutputModel 
                outputs.push(output.toRaw().default())
            }
    
            return {
                lh: this.get().lughHeight().bytes('uint32').bytes(),
                t: this.get().time().bytes('uint64').bytes(),
                inputs,
                outputs
            }
        }

        const base64 = () => {
            const inputs = this.get().inputs()
            const outputs = this.get().outputs()

            return {
                lh: this.get().lughHeight().base64('uint32'),
                t: this.get().time().base64('uint64'),
                inputs: inputs.map((inp: InputModel) => inp.toRaw().base64()),
                outputs: outputs.map((out: OutputModel) => out.toRaw().base64())
            }
        }

        return { default: def, base64 }
    }

    toString = () => {
        const plain = this.to().plain()
        for (let i = 0; i < plain.inputs.length; i++){
            plain.inputs[i].script_sig = (this.get().inputs().nodeAt(i) as InputModel).get().script().toString()
        }

        for (let i = 0; i < plain.outputs.length; i++){
            plain.outputs[i].script = (this.get().outputs().nodeAt(i) as OutputModel).get().script().toString()
        }
        return plain
    }

}

export class TransactionCollection extends Collection {

    constructor(initialState: any, options: any){
        super(initialState, [TransactionModel, TransactionCollection], options)
    }

}