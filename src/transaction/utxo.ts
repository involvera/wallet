import { Collection, Model } from 'acey'
import { Output, InputList } from '.'
import { CYCLE_IN_LUGH, ROOT_API_URL } from '../constant'
import { CalculateOutputMeltedValue } from '../util/output'
import fetch from 'node-fetch'
import { ITransaction, Transaction } from './transaction'
import { IHeaderSignature } from '../wallet/wallet'
 
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

    fetchPrevTxList = async (headerSignature: IHeaderSignature) => {
        const listUnFetchedTxHash = this.get().listUnFetchedTxHash()
        if (listUnFetchedTxHash.length == 0)
            return 

        try { 
            const response = await fetch(ROOT_API_URL + '/transactions/list', {
                method: 'GET',
                headers: Object.assign({}, headerSignature as any, {list: listUnFetchedTxHash})
            })
            if (response.status == 200){
                let list = await response.json()
                console.log(list)
                list = list || []
                for (let i = 0; i < listUnFetchedTxHash.length; i++){
                    const UTXO = this.get().UTXOByTxHash(listUnFetchedTxHash[i])
                    UTXO?.setState({ tx: new Transaction(list[i], this.kids())}).store()
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

        const UTXOByTxHash = (txHashHex: string): UTXO | undefined => {
            const u = this.find((utxo: UTXO) => utxo.get().txID() === txHashHex)
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
            listUnFetchedTxHash
        }
    }
}