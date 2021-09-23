import axios from 'axios'
import { Model } from 'acey'

import { IOutput, OutputCollection, OutputModel } from './output'
import { IInput, InputModel, InputCollection } from './input'
import { Wallet } from '../wallet/wallet'
import { IInputRaw } from './input'
import { IOutputRaw } from './output'

import { ByteArrayToB64, EncodeInt, EncodeInt64, IsUUID, Sha256, UUIDToPubKeyHashHex } from 'wallet-util'
import { BILLED_SIGNATURE_LENGTH, TXID_LENGTH } from '../constant'
import { Constant } from 'wallet-script'

import config from '../config'

export interface ITransaction {
    lh:      number
	t:       number
	inputs:  IInput[]
	outputs: IOutput[] 
}

export interface ITransactionRaw {
    lh:      Buffer
	t:       Buffer
	inputs:  IInputRaw[]
	outputs: IOutputRaw[] 
}

export const DEFAULT_STATE: ITransaction = {
    lh: 0,
    t: 0,
    inputs: [],
    outputs: []
}

export class Transaction extends Model {
    static FetchTX = async (hashOrUUID: string) => {

        let hash = hashOrUUID
        if (IsUUID(hashOrUUID)){
            hash = UUIDToPubKeyHashHex(hashOrUUID)
        }
        const response = await axios(config.getRootAPIChainUrl() + '/transaction/' + hash, {
            timeout: 10000,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            },
        })
        if (response.status == 200){
            const json = response.data
            return new Transaction(json, {})
        }
        throw new Error(response.data)
    }

    constructor(tx: ITransaction = DEFAULT_STATE, options: any) {
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

    broadcast = async (wallet: Wallet) => {
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
                const { transaction: {lh, t}, puts, utxos } = response.data
                this.setState({lh, t})
                wallet.info().iterateTotalContent(this.get().outputs().countContent())
                wallet.utxos().get().removeUTXOsFromInputs(this.get().inputs())
                wallet.utxos().get().append(utxos || []).store()
                wallet.puts()._handleJSONResponse(puts)
            }
            return response
        } catch (e: any){
            throw new Error(e)
        }
    }

    isLugh = () => this.get().inputs().count() == 1 && this.get().inputs().nodeAt(0) && (this.get().inputs().nodeAt(0) as InputModel).get().prevTxHash().length == 0

    get = () => {
        const time = (): number => this.state.t
        const lughHeight = (): number => this.state.lh
        const hash = () => Sha256(this.to().string())
        const hashHex = () => hash().toString('hex')
        const inputs = (): InputCollection => this.state.inputs
        const outputs = (): OutputCollection => this.state.outputs

        const billedSize = (): number => {
            let size = this.size()
            size -= this.get().inputs().size()

            const countInputs = this.get().inputs().count()
            const scriptSize = countInputs + (countInputs * Constant.PUBK_LENGTH) + (countInputs * BILLED_SIGNATURE_LENGTH) + (countInputs * 2)
            const voutSize = countInputs * 4
            const prevTxHashSize = countInputs * TXID_LENGTH

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
            hashHex, 
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
                lh: EncodeInt(BigInt(this.get().lughHeight())),
                t: EncodeInt64(BigInt(this.get().time())),
                inputs,
                outputs
            }
        }

        const base64 = () => {
            const raw = def()
            const inputs = this.get().inputs()
            const outputs = this.get().outputs()

            return {
                lh: ByteArrayToB64(raw.lh), 
                t: ByteArrayToB64(raw.t), 
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

