import { Model } from 'acey'

export interface IMemory {
    last_put_fetch_height: number
    is_recovered_wallet: boolean
}

export const DEFAULT_STATE: IMemory = {
    last_put_fetch_height: 0, 
    is_recovered_wallet: false
}

export class MemoryModel extends Model {

    constructor(state: IMemory = DEFAULT_STATE, options: any){
        super(state, options)
    }

    setRecovered = () => this.setState({ is_recovered_wallet: true }).store()
    setLastPutFetchHeight = (last_put_fetch_height: number) => this.setState({ last_put_fetch_height })

    get = () => {
        return {
            lastPutFetchHeight: (): number => this.state.last_put_fetch_height,
        }
    }
}