import { Collection, Model } from 'acey'
import { ByteArrayToString, IntToByteArray, StringToByteArray } from '../util'
import { Output, InputList } from '.'

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

    txID = (): Uint8Array => StringToByteArray(Buffer.from(this.state.tx_id, 'base64').toString('utf-8'))
    idx = (): BigInt => BigInt(this.state.idx)
    output = (): Output => this.state.output
    mr = (): number => this.state.mr
    cch = (): Uint8Array => StringToByteArray(Buffer.from(this.state.cch, 'base64').toString('utf-8'))

}

export class UTXOList extends Collection {

    static deserialize = (serialized: Uint8Array): IUTXO[] => {
        return JSON.parse(ByteArrayToString(serialized))
    }

    constructor(list: IUTXO[] = [], options: any){
        super(list, [UTXO, UTXOList], options)
    }

    toInputs = () => {
        return new InputList(
            this.map((utxo: UTXO) => {
                return {prev_transaction_hash: utxo.txID(), vout: IntToByteArray(utxo.idx()), sign: new Uint8Array()}
            }),
            {}
        )
    }

    totalValue = () => {
        let total = BigInt(0)
        this.map((utxo: UTXO) => {
            total += BigInt(utxo.output().getValueBigInt())
        })
        return total
    }

    serialize = () => StringToByteArray(this.to().string())
}