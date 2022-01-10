import axios from 'axios'
import { Collection, Model } from 'acey'
import { CalculateOutputMeltedValue } from 'wallet-util'
import config from '../config'

import { IOutput, OutputModel } from './output'
import { CYCLE_IN_LUGH } from '../constant'
import { ITransaction, Transaction } from './transaction'
import { IHeaderSignature } from '../wallet/wallet'
import { InputModel, InputCollection } from './input'
 
export interface IUTXO {
    tx_id: string
    idx: number
    output: IOutput
    tx: null | ITransaction 
    mr: number
    cch: string
}

export class UTXOModel extends Model {

    
    constructor(utxo: IUTXO, options: any) {
        super(utxo, options)
        this.setState({
            output: new OutputModel(this.state.output, this.kids()),
            tx: utxo && utxo.tx ? new Transaction(utxo.tx, this.kids()) : null
        })
    }

    get = () => {
        const txID = (): string => this.state.tx_id
        const idx = (): number => this.state.idx
        const output = (): OutputModel => this.state.output
        const MR = (): number => this.state.mr
        const CCH = (): string => this.state.cch
        const tx = (): Transaction | null => this.state.tx
    
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

        const meltedValue = (CCHList: string[]) => CalculateOutputMeltedValue(output().get().value(), meltedValueRatio(CCHList))

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
                return {prev_transaction_hash: utxo.get().txID(), vout: utxo.get().idx(), script_sig: Buffer.from([]) }
            }),
            {}
        )
    }

    removeUTXOsFromInputs = (inputs: InputCollection) => {
        inputs.map((i: InputModel) => {
            this.deleteBy((utxo: UTXOModel) => {
                return utxo.get().txID() == i.get().prevTxHash() && utxo.get().idx() == i.get().vout()
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
            if (response.status == 200){
                let list = response.data
                list = list || []
                for (let i = 0; i < listUnFetchedTxHash.length; i++){
                    const UTXOs = this.get().UTXOByTxHash(listUnFetchedTxHash[i])
                    if (UTXOs){
                        UTXOs.forEach((u: UTXOModel) => {
                            u?.setState({ tx: new Transaction(list[i], this.kids())}).store()
                        })

                    }
                }
            }
            return response.status
        } catch (e: any){
            throw new Error(e)
        }
    }

    get = () => {
        const listUnFetchedTxHash = () => {
            const ret: string[] = []
            for (let i = 0; i < this.count(); i++){
                const utxo = this.nodeAt(i) as UTXOModel
                !utxo.get().tx() && ret.push(utxo.get().txID())
            }
            return ret
        }

        const UTXOByTxHash = (txHashHex: string): UTXOCollection | undefined => {
            const u = this.filter((utxo: UTXOModel) => utxo.get().txID() === txHashHex)
            return u ? u as UTXOCollection : undefined
        }

        const UTXOByTxHashAndVout = (txHashHex: string, vout: number): UTXOModel | undefined => {
            const u = UTXOByTxHash(txHashHex)?.find((utxo: UTXOModel) => utxo.get().idx() === vout)
            return u ? u as UTXOModel : undefined
        }

        const requiredList = (amountRequired: number, CCHList: string[]): UTXOCollection => {
            let ret: UTXOModel[] = []
            let amountGot = 0

            for (let i = 0; i < this.count(); i++){
                ret.push(this.nodeAt(i) as UTXOModel)
                amountGot += (this.nodeAt(i) as UTXOModel).get().meltedValue(CCHList)
                if (amountGot > amountRequired) 
                    break
            }
            return this.newCollection(ret) as UTXOCollection
        }

        const totalValue = () => {
            let total = BigInt(0)
            this.map((utxo: UTXOModel) => {
                total += BigInt(utxo.get().output().get().value() as any)
            })
            return total
        }

        const totalMeltedValue = (CCHList: string[]) => {
            let total = 0
            this.map((utxo: UTXOModel) => {
                total += utxo.get().meltedValue(CCHList)
            })
            return total
        }

        return { 
            totalMeltedValue, requiredList, 
            totalValue, UTXOByTxHash,
            listUnFetchedTxHash,
            UTXOByTxHashAndVout
        }
    }
}