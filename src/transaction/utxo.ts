import axios from 'axios'
import { ONCHAIN} from 'community-coin-types'
import { Collection, Model } from 'acey'
import { Inv } from 'wallet-util'
import config from '../config'

import { OutputModel } from './output'
import { CYCLE_IN_LUGH } from '../constant'
import {TransactionModel} from './transaction'
import { InputModel, InputCollection } from './input'
 
export const CalculateOutputMeltedValue = (amount: Inv.InvBigInt, meltedRatio: number): Inv.InvBigInt => {
    return new Inv.InvBigInt(amount.mulDecimals(meltedRatio))
}

export class UTXOModel extends Model {
    
    constructor(utxo: ONCHAIN.IUTXOUnRaw, options: any) {
        super(utxo, options)
        this.setState({
            output: new OutputModel(this.state.output, this.kids()),
            tx: utxo && utxo.tx ? new TransactionModel(utxo.tx, this.kids()) : null
        })
    }

    get = () => {
        const txID = (): Inv.TxHash => Inv.TxHash.fromHex(this.state.tx_id)
        const idx = (): number => this.state.idx
        const output = (): OutputModel => this.state.output
        const meltedRatio = (): number => this.state.mr
        const lughHeight = (): number => this.state.lh
        const tx = (): TransactionModel | null => this.state.tx
    
        const meltedValueRatio = (currentHeight: number) => {
           const diff = currentHeight - lughHeight()
           if (meltedRatio() == -1)
            return meltedRatio()
           if (diff >= CYCLE_IN_LUGH)
            return 0

            const r = meltedRatio() - ((1 / CYCLE_IN_LUGH) * diff)
            if (r > 1 || r < 0) 
                return 0

            return r
        }
           
        const meltedValue = (currentHeight: number) => CalculateOutputMeltedValue(output().get().value(), meltedValueRatio(currentHeight))

        return { 
            meltedValue, meltedValueRatio,
            lughHeight, meltedRatio, txID, idx, output,
            tx
        }
    }
}

export class UTXOCollection extends Collection {

    constructor(list: ONCHAIN.IUTXOUnRaw[] = [], options: any){
        super(list, [UTXOModel, UTXOCollection], options)
    }

    toInputs = () => {
        return new InputCollection(
            this.map((utxo: UTXOModel) => {
                return {prev_transaction_hash: utxo.get().txID().hex(), vout: utxo.get().idx(), script_sig: [] as string[] }
            }),
            {}
        )
    }

    removeUTXOsFromInputs = (inputs: InputCollection) => {
        inputs.map((i: InputModel) => {
            this.deleteBy((utxo: UTXOModel) => {
                return utxo.get().txID().eq(i.get().prevTxHash()) && utxo.get().idx() === i.get().vout()
            })
        })
        return this.action()
    }

    fetchPrevTxList = async (headerSignature: ONCHAIN.IHeaderSignature) => {
        const listUnFetchedTxHash = this.get().listUnFetchedTxHash()
        if (listUnFetchedTxHash.length == 0)
            return 
        try { 
            const response = await axios(config.getRootAPIChainUrl() + '/transactions/list', {
                headers: Object.assign({}, headerSignature as any, {list: listUnFetchedTxHash.join(',') }),
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            const { status, data } = response
            return {status, data}
        } catch (e: any){
            throw new Error(e)
        }
    }

    get = () => {
        const listUnFetchedTxHash = (): string[] => {
            return this.map((u: UTXOModel) => {
                if (!u.get().tx())
                    return u.get().txID().hex()
                return null
            }).filter(e => !!e)
        }

        const UTXOByTxHash = (txHashHex: string) => {
            return this.filter((utxo: UTXOModel) => utxo.get().txID().hex() === txHashHex) as UTXOCollection
        }

        const UTXOByTxHashAndVout = (txHashHex: string, vout: number): UTXOModel | undefined => {
            return UTXOByTxHash(txHashHex)?.find((utxo: UTXOModel) => utxo.get().idx() === vout) as UTXOModel
        }

        const requiredList = (amountRequired: Inv.InvBigInt, currentHeight: number): UTXOCollection => {
            let ret: UTXOModel[] = []
            let amountGot = new Inv.InvBigInt(0)

            for (let i = 0; i < this.count(); i++){
                const utxo = (this.nodeAt(i) as UTXOModel)
                ret.push(utxo)
                amountGot.addEq(utxo.get().meltedValue(currentHeight))
                if (amountGot.gt(amountRequired))
                    break
            }
            return this.newCollection(ret) as UTXOCollection
        }

        const totalValue = (): Inv.InvBigInt => this.reduce((accumulator: Inv.InvBigInt, utxo: UTXOModel) => accumulator.add(utxo.get().output().get().value()), new Inv.InvBigInt(0))
        const totalMeltedValue = (currentHeight: number): Inv.InvBigInt => this.reduce((accumulator: Inv.InvBigInt, utxo: UTXOModel) => accumulator.add(utxo.get().meltedValue(currentHeight)), new Inv.InvBigInt(0))

        return { 
            totalMeltedValue, requiredList, 
            totalValue, UTXOByTxHash,
            listUnFetchedTxHash,
            UTXOByTxHashAndVout
        }
    }
}