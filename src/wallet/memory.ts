import { Model } from 'acey'

export interface IMemory {
    last_put_fetch_height: number
    is_recovered_wallet: boolean

}

const DEFAULT_STATE: IMemory = {
    last_put_fetch_height: 0,
    is_recovered_wallet: false
}

export default class MemoryModel extends Model {

    static DefaultState: IMemory = DEFAULT_STATE

    constructor(state: IMemory = DEFAULT_STATE, options: any){
        super(state, options)
    }

    setRecovered = () => this.setState({ is_recovered_wallet: true }).store()
    setLastPutFetchHeight = (last_put_fetch_height: number) => this.setState({ last_put_fetch_height }).store()

    get = () => {
        return {
            lastPutFetchHeight: (): number => this.state.last_put_fetch_height,
            isRecoveredWallet: (): boolean => this.state.is_recovered_wallet,
        }
    }
}