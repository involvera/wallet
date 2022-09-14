import axios from 'axios'
import { ITransactionUnRaw, ITransactionRaw, IOutputRaw, IInputRaw, TByte } from 'community-coin-types'
import { Collection, Model } from 'acey'
import { Inv, Lib } from 'wallet-util'

import { OutputCollection, OutputModel } from './output'
import { InputModel, InputCollection } from './input'
import WalletModel from '../wallet/wallet'
import config from '../config'
import { Script } from 'wallet-script'

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
                    return status >= 200 && status <= 500;
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
        const time = () => new Inv.InvBigInt(this.state.t)
        const lughHeight = (): number =>this.state.lh
        const version = (): TByte => this.state.v || 0
        const hash = () => {
            if (version() === 0){
                const p = this.to().plain()
                delete p.v
                return new Inv.TxHash(Sha256(JSON.stringify(p)))
            }
            if (version() === 1){
                const inputs = this.get().inputs().map((i: InputModel) => {
                    const r = i.toRaw().default()
                    return Inv.InvBuffer.FromUint8s(
                        r.prev_transaction_hash,
                        new Inv.InvBigInt(i.get().vout()).bytes('int64').bytes(),
                        ...r.script_sig
                    ).bytes()
                }) as Uint8Array[]

                const outputs = this.get().outputs().map((out: OutputModel) => {
                    const idxs = out.get().inputSourceIdxs().map((n: number) => new Inv.InvBigInt(n).bytes('int64').bytes())
                    return Inv.InvBuffer.FromUint8s(
                        out.get().value().bytes('int64').bytes(),
                        ...idxs,
                        ...out.get().script().bytes()
                    ).bytes()
                }) as Uint8Array[]

                const hash = Inv.InvBuffer.FromUint8s(
                    new Uint8Array([version()]),
                    new Inv.InvBigInt(this.get().lughHeight()).bytes('int64').bytes(),
                    this.get().time().bytes('int64').bytes(),
                    ...inputs,
                    ...outputs
                )
                return new Inv.TxHash(Sha256(hash.bytes()))
            }
            throw new Error("wrong version")
        }
        
        const inputs = (): InputCollection => this.state.inputs
        const outputs = (): OutputCollection => this.state.outputs

        const billedSize = (): Inv.InvBigInt => {
            let size = this.size() - this.get().inputs().size()
            size += this.get().inputs().count() * (Inv.Signature.LENGTH_MAX + Inv.PubKey.LENGTH) + this.get().inputs().count()
            return new Inv.InvBigInt(size)
        }

        const fees = (feePerByte: Inv.InvBigInt): Inv.InvBigInt => billedSize().mul(feePerByte)

        return {
            time, lughHeight,
            hash, inputs, outputs,
            billedSize,
            version,
            fees,
        }
    }

    toRaw = () => {
        const def = (): ITransactionRaw => {
            return {
                v: this.get().version(),
                lh: new Inv.InvBigInt(this.get().lughHeight()).bytes('int32').bytes(),
                t: this.get().time().bytes('int64').bytes(),
                inputs: this.get().inputs().map((input: InputModel) => input.toRaw().default()),
                outputs: this.get().outputs().map((out: OutputModel) => out.toRaw().default())
            }
        }

        const base64 = () => {
            return {
                v: this.get().version(),
                lh: new Inv.InvBigInt(this.get().lughHeight()).base64('int32'),
                t: this.get().time().base64('int64'),
                inputs: this.get().inputs().map((inp: InputModel) => inp.toRaw().base64()),
                outputs: this.get().outputs().map((out: OutputModel) => out.toRaw().base64())
            }
        }

        return { default: def, base64 }
    }

    toString = () => {
        const plain = this.to().plain()
        plain.inputs = plain.inputs.map((e: any) => Script.fromBase64(e.script_sig).pretty())
        plain.outputs = plain.outputs.map((e: any) => Script.fromBase64(e.script).pretty())
        return plain
    }

}

export class TransactionCollection extends Collection {

    constructor(initialState: any, options: any){
        super(initialState, [TransactionModel, TransactionCollection], options)
    }

}