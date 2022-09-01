import axios from 'axios'
import { ITransactionUnRaw, IOutputUnRaw } from 'community-coin-types'
import { Collection, Model } from 'acey'
import { Inv } from 'wallet-util'
import config from '../config'

import { OutputModel } from './output'
import { CYCLE_IN_LUGH } from '../constant'
import {TransactionModel} from './transaction'
import { IHeaderSignature } from '../wallet/wallet'
import { InputModel, InputCollection } from './input'
 
export interface IUTXO {
    tx_id: string
    idx: number
    output: IOutputUnRaw
    tx: null | ITransactionUnRaw 
    mr: number
    cch: string
}

export const CalculateOutputMeltedValue = (amount: Inv.InvBigInt, meltedRatio: number): Inv.InvBigInt => {
    return new Inv.InvBigInt(amount.mulDecimals(meltedRatio))
}

export class UTXOModel extends Model {
    
    constructor(utxo: IUTXO, options: any) {
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
        const MR = (): number => this.state.mr
        const CCH = (): string => this.state.cch
        const tx = (): TransactionModel | null => this.state.tx
    
        const meltedValueRatio = (CCHList: string[]) => {
            let count = 0
            for (const cch of CCHList){
                if (cch === CCH())
                    break
                count++
            }
            if (count == CCHList.length) 
                return 0
            
            const r = MR() - ((1 / CYCLE_IN_LUGH) * count)
            if (r > 1 || r < 0) 
                return 0

            return r
        }

        const meltedValue = (CCHList: string[]) => new Inv.InvBigInt(CalculateOutputMeltedValue(output().get().value(), meltedValueRatio(CCHList)))

        return { 
            meltedValue, meltedValueRatio,
            cch: CCH, mr: MR, txID, idx, output,
            tx
        }
    }
}

export class UTXOCollection extends Collection {

    constructor(list: IUTXO[] = [], options: any){
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
                return utxo.get().txID().eq(i.get().prevTxHash()) && utxo.get().idx() === i.get().vout().number()
            })
        })
        return this.action()
    }

    fetchPrevTxList = async (headerSignature: IHeaderSignature) => {
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

        const requiredList = (amountRequired: Inv.InvBigInt, CCHList: string[]): UTXOCollection => {
            let ret: UTXOModel[] = []
            let amountGot = new Inv.InvBigInt(0)

            for (let i = 0; i < this.count(); i++){
                const utxo = (this.nodeAt(i) as UTXOModel)
                ret.push(utxo)
                amountGot = amountGot.add(utxo.get().meltedValue(CCHList))
                //amountGot > amountRequired
                if (amountGot.gt(amountRequired))
                    break
            }
            return this.newCollection(ret) as UTXOCollection
        }

        const totalValue = (): Inv.InvBigInt => this.reduce((accumulator: Inv.InvBigInt, utxo: UTXOModel) => accumulator.add(utxo.get().output().get().value()), new Inv.InvBigInt(0))
        const totalMeltedValue = (CCHList: string[]): Inv.InvBigInt => this.reduce((accumulator: Inv.InvBigInt, utxo: UTXOModel) => accumulator.add(utxo.get().meltedValue(CCHList)), new Inv.InvBigInt(0))

        return { 
            totalMeltedValue, requiredList, 
            totalValue, UTXOByTxHash,
            listUnFetchedTxHash,
            UTXOByTxHashAndVout
        }
    }
}