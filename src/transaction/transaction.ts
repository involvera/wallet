import { Model } from 'acey'
import { IOutput, OutputList } from './output'
import { IInput, Input, InputList } from './input'
import { ByteArrayToB64, EncodeInt, EncodeInt64, IsUUID, Sha256 } from '../util'
import { Wallet } from '../wallet/wallet'
import { IInputRaw } from './input'
import { IOutputRaw, Output } from './output'
import { UTXO, UTXOList } from './utxo'

import axios from 'axios'

import { BILLED_SIGNATURE_LENGTH } from '../constant'
import config from '../config'
import { UUIDToPubKeyHashHex } from '../util/hash'

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
            throw new Error(e)
        }
    }

    isLugh = () => this.get().inputs().count() == 1 && this.get().inputs().nodeAt(0) && (this.get().inputs().nodeAt(0) as Input).get().prevTxHash().length == 0

    sign = async (utxos: UTXOList, wallets: Wallet[]) => {
        try {

            const utxos2 = new UTXOList([], undefined)
            for (let i = 0; i < wallets.length; i++){
                const w = wallets[i]
                const wUTXOs = new UTXOList([], undefined)
                utxos.map((u: UTXO) => {          
                    const exist = w.utxos().get().get().UTXOByTxHashAndVout(u.get().txID(), u.get().idx())
                    exist && wUTXOs.push(exist)
                })
                await wUTXOs.fetchPrevTxList(w.sign().header())
                utxos2.concat(wUTXOs.state)
            }

            const inputs = this.get().inputs()

            for (let i = 0; i < inputs.count(); i++){
                const prevTx = (utxos.nodeAt(i) as UTXO).get().tx() as Transaction
                const input = this.get().inputs().nodeAt(i) as Input
                let signature = ''
                for (let i = 0; i < wallets.length; i++){
                    const w = wallets[i]
                    const exist = w.utxos().get().get().UTXOByTxHashAndVout(input.get().prevTxHash(), input.get().vout())
                    if (exist){
                        signature = w.sign().value(prevTx.get().hash())                
                    }
                }
                input.setState({ sign: Buffer.from(signature).toString('hex') })
            }
            return true
        } catch (e) {
            throw new Error(e);            
        }
    }

    get = () => {
        const time = (): number => this.state.t
        const lughHeight = (): number => this.state.lh
        const hash = () => Sha256(this.to().string())
        const hashHex = () => hash().toString('hex')
        const inputs = (): InputList => this.state.inputs
        const outputs = (): OutputList => this.state.outputs

        const billedSize = (): number => {
            const totalSignatureSizeInputs = inputs().reduce((total: number, input: Input) => {
                total += input.toRaw().base64().sign.length
                return total
            }, 0) as any

            return (Buffer.from(JSON.stringify(this.toRaw().base64())).length + (this.get().inputs().count() * BILLED_SIGNATURE_LENGTH)) - totalSignatureSizeInputs
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
}

