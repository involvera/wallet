import axios from 'axios'
import { Collection, Model } from 'acey'
import { Output } from './output'

import { CYCLE_IN_LUGH } from '../constant'
import { CalculateOutputMeltedValue } from '../util/output'
import { ITransaction, Transaction } from './transaction'
import { IHeaderSignature } from '../wallet/wallet'
import { Input, InputList } from './input'
import config from '../config'
 
export interface IUTXO {
    tx_id: string
    idx: number
    output: Output
    tx: null | ITransaction 
    mr: number
    cch: string
}

export class UTXO extends Model {
    constructor(utxo: IUTXO, options: any) {
        super(utxo, options)
        this.setState({
            output: new Output(this.state.output, this.kids()),
            tx: utxo && utxo.tx ? new Transaction(utxo.tx, this.kids()) : null
        })
    }

    get = () => {
        const txID = (): string => this.state.tx_id
        const idx = (): number => this.state.idx
        const output = (): Output => this.state.output
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

export class UTXOList extends Collection {

    constructor(list: IUTXO[] = [], options: any){
        super(list, [UTXO, UTXOList], options)
    }

    toInputs = () => {
        return new InputList(
            this.map((utxo: UTXO) => {
                return {prev_transaction_hash: utxo.get().txID(), vout: utxo.get().idx(), sign: ''}
            }),
            {}
        )
    }

    removeUTXOsFromInputs = (inputs: InputList) => {
        inputs.map((i: Input) => {
            this.deleteBy((utxo: UTXO) => {
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
            const response = await axios(config.getRootAPIUrl() + '/transactions/list', {
                headers: Object.assign({}, headerSignature as any, {list: listUnFetchedTxHash.join(',') }),
                timeout: 10000,
            })
            if (response.status == 200){
                let list = response.data
                list = list || []
                for (let i = 0; i < listUnFetchedTxHash.length; i++){
                    const UTXOs = this.get().UTXOByTxHash(listUnFetchedTxHash[i])
                    if (UTXOs){
                        UTXOs.forEach((u: UTXO) => {
                            u?.setState({ tx: new Transaction(list[i], this.kids())}).store()
                        })

                    }
                }
            }
            return response.status
        } catch (e){
            throw new Error(e)
        }
    }

    get = () => {
        const listUnFetchedTxHash = () => {
            const ret: string[] = []
            for (let i = 0; i < this.count(); i++){
                const utxo = this.nodeAt(i) as UTXO
                !utxo.get().tx() && ret.push(utxo.get().txID())
            }
            return ret
        }

        const UTXOByTxHash = (txHashHex: string): UTXOList | undefined => {
            const u = this.filter((utxo: UTXO) => utxo.get().txID() === txHashHex)
            return u ? u as UTXOList : undefined
        }

        const UTXOByTxHashAndVout = (txHashHex: string, vout: number): UTXO | undefined => {
            const u = UTXOByTxHash(txHashHex)?.find((utxo: UTXO) => utxo.get().idx() === vout)
            return u ? u as UTXO : undefined
        }

        const requiredList = (amountRequired: number, CCHList: string[]): UTXOList => {
            let ret: UTXO[] = []
            let amountGot = 0

            for (let i = 0; i < this.count(); i++){
                ret.push(this.nodeAt(i) as UTXO)
                amountGot += (this.nodeAt(i) as UTXO).get().meltedValue(CCHList)
                if (amountGot > amountRequired) 
                    break
            }
            return this.newCollection(ret) as UTXOList
        }

        const totalValue = () => {
            let total = BigInt(0)
            this.map((utxo: UTXO) => {
                total += BigInt(utxo.get().output().get().value())
            })
            return total
        }

        const totalMeltedValue = (CCHList: string[]) => {
            let total = 0
            this.map((utxo: UTXO) => {
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