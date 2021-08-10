import { Model } from 'acey'

export interface IScriptOrigin {
    tx_id: string | null
    vout: number
}

export class OriginModel extends Model {
    constructor(state: IScriptOrigin, options: any){
        super(state, options)
    }
    get = () =>{
        return {
            txID: (): string | null => this.state.tx_id,
            vout: (): number => this.state.vout,
        }
    }
}