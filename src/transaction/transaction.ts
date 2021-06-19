import { Model } from 'acey'
import { IOutput, OutputList } from './output'
import { IInput, Input, InputList } from './input'
import { ByteArrayToB64, EncodeInt, EncodeInt64, IsUUID, Sha256, UUIDToPubKeyHashHex } from 'wallet-util'
import { Wallet } from '../wallet/wallet'
import { IInputRaw } from './input'
import { IOutputRaw, Output } from './output'
import axios from 'axios'

import { BILLED_SIGNATURE_LENGTH, PUBK_LENGTH, TXID_LENGTH } from '../constant'
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

export class Transaction extends Model {
    static FetchTX = async (hashOrUUID: string) => {

        let hash = hashOrUUID
        if (IsUUID(hashOrUUID)){
            hash = UUIDToPubKeyHashHex(hashOrUUID)
        }
        const response = await axios(config.getRootAPIUrl() + '/transaction/' + hash, {
            timeout: 10000,
        })
        if (response.status == 200){
            const json = response.data
            return new Transaction(json, {})
        }
        throw new Error(response.data)
    }

    constructor(tx: ITransaction, options: any) {
        super(tx, options)
        this.setState({
            inputs: new InputList(this.state.inputs, this.kids()),
            outputs: new OutputList(this.state.outputs, this.kids()),
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
            const response = await axios(config.getRootAPIUrl() + '/transaction', {
                method: 'POST',
                headers: Object.assign(wallet.sign().header() as any, {'content-type': 'application/json' }),
                data: this.toRaw().base64(),
                timeout: 15000,
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
        } catch (e){
            console.log(e.response.data)
            throw new Error(e)
        }
    }

    isLugh = () => this.get().inputs().count() == 1 && this.get().inputs().nodeAt(0) && (this.get().inputs().nodeAt(0) as Input).get().prevTxHash().length == 0

    get = () => {
        const time = (): number => this.state.t
        const lughHeight = (): number => this.state.lh
        const hash = () => Sha256(this.to().string())
        const hashHex = () => hash().toString('hex')
        const inputs = (): InputList => this.state.inputs
        const outputs = (): OutputList => this.state.outputs

        const billedSize = (): number => {
            let size = this.size()
            size -= this.get().inputs().size()

            const countInputs = this.get().inputs().count()
            const scriptSize = countInputs + (countInputs * PUBK_LENGTH) + (countInputs * BILLED_SIGNATURE_LENGTH) + (countInputs * 2)
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
                const input = this.get().inputs().nodeAt(i) as Input 
                inputs.push(input.toRaw().default())
            }
    
            for (let i = 0; i < this.get().outputs().count(); i++){
                const output = this.get().outputs().nodeAt(i) as Output 
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
                inputs: inputs.map((inp: Input) => inp.toRaw().base64()),
                outputs: outputs.map((out: Output) => out.toRaw().base64())
            }
        }

        return { default: def, base64 }
    }

    toString = () => {
        const plain = this.to().plain()
        for (let i = 0; i < plain.inputs.length; i++){
            plain.inputs[i].script_sig = (this.get().inputs().nodeAt(i) as Input).get().script().toString()
        }

        for (let i = 0; i < plain.outputs.length; i++){
            plain.outputs[i].script = (this.get().outputs().nodeAt(i) as Output).get().script().toString()
        }
        return plain
    }

}

