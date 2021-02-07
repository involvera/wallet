
import { ByteArrayToString, StringToByteArray } from "../util"
import { IUTXO } from "./utxo"
import { Input } from './input'


export class UTXOS {

    static deserialize = (serialized: Uint8Array): UTXOS => {
        return new UTXOS(JSON.parse(ByteArrayToString(serialized)))
    }

    utxos: IUTXO[]
    constructor(list: IUTXO[]){
        this.utxos = list
    }

    toInputs = () => {
        var inputs: Input[]
        for (let i = 0; i < this.utxos.length; i++){
            // inputs.push()
        }

    }
    serialize = () => StringToByteArray(JSON.stringify(this.utxos))
}