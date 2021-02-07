import { IInput } from './input'
import { IOutput } from './output' 
import { StringToByteArray, ByteArrayToString, ByteArrayToInt, Sha256 } from '../util'

export interface ITransaction {
    lh:      Uint8Array
	t:       Uint8Array
	inputs:  IInput[]
	outputs: IOutput[] 
}

export class Transaction {

    static Deserialize = (serialized: Uint8Array): Transaction => {
        return new Transaction(JSON.parse(ByteArrayToString(serialized)))
    }

    public tx: ITransaction
    
    constructor(tx: ITransaction) {
        this.tx = tx
    }

    Serialize = () => StringToByteArray(JSON.stringify(this.tx))

    GetTime = () => this.tx.t
    GetTimeInt = () => ByteArrayToInt(this.GetTime(), false)

    GetHash = () => Sha256(this.Serialize())



    IsLugh = () => this.tx.inputs.length == 1 && this.tx.inputs[0].prev_transaction_hash.length == 0 
}

