import { Collection, Model } from 'acey'
import { B64ToByteArray, IntToByteArray } from '../util'
import { Output, InputList } from '.'
import { wallet } from '../models'
import { CYCLE_IN_LUGH } from '../constant'
 
export interface IUTXO {
    tx_id: Uint8Array
    idx: BigInt
    output: Output
    mr: number
    cch: Uint8Array
}

export class UTXO extends Model {
    constructor(utxo: IUTXO, options: any) {
        super(utxo, options)
        this.setState({
            output: new Output(this.state.output, this.kids())
        })
    }

    get = () => {
        const txID = () => B64ToByteArray(this.state.tx_id)
        const idx = (): BigInt => BigInt(this.state.idx)
        const output = (): Output => this.state.output
        const MR = (): number => this.state.mr
        const CCH = (): Uint8Array => B64ToByteArray(this.state.cch)

        const meltedValueRatio = () => {
            const list = wallet.cch().get() 
            let count = 0
            for (const cch of list){
                if (JSON.stringify(B64ToByteArray(cch)) == JSON.stringify(CCH())){
                    break
                }
                count++
            }
            if (count == list.length) 
                return 0
            
            const r = MR() - ((1 / CYCLE_IN_LUGH) * count)
            if (r > 1 || r < 0) 
                return 0

            return r
        }

        const meltedValue = () => {
            /* 
                The value owned by an UTXO can excess the 2^53 limit of JS for precision, but once divided by 2 it can't.
                So we divide the value by 2 to get the right precision, because the maximum value for an output value is between 2^53 & 2^54.
                Then we add it back at the end because the maximum value for a melted output is < 2^53
            */
            const DIVIDER = 2
            const safeNumberValueInt = BigInt(output().get().valueBigInt()) / BigInt(DIVIDER)
            const nStr = output().get().valueBigInt().toString()
            const isLastNumberOdd = parseInt(nStr[nStr.length-1]) % 2 == 1
            const mr = meltedValueRatio()
            const rest = isLastNumberOdd ? (1 * mr) : 0

            return Math.floor(((Number(safeNumberValueInt) * mr) * DIVIDER) + rest)
        }

        return { 
            meltedValue, meltedValueRatio,
            cch: CCH, mr: MR, txID, idx, output
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
                return {prev_transaction_hash: utxo.get().txID(), vout: IntToByteArray(utxo.get().idx()), sign: new Uint8Array()}
            }),
            {}
        )
    }

    get = () => {
        const totalValue = () => {
            let total = BigInt(0)
            this.map((utxo: UTXO) => {
                total += BigInt(utxo.get().output().get().valueBigInt())
            })
            return total
        }
        const totalMeltedValue = () => {
            let total = 0
            this.map((utxo: UTXO) => {
                total += utxo.get().meltedValue()
            })
            return total
        }

        return { totalValue, totalMeltedValue }
    }
}