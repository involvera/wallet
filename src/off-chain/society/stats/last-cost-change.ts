import { Model } from 'acey'

export interface ILastCostChangeProposal {
    created_at: number
    price: number
    index: number
    pubkh: string
    t: string
}

export const DEFAULT_STATE: ILastCostChangeProposal = {
    created_at: 0,
    price: 0,
    index: 0,
    pubkh: '',
    t: '' 
}

export class LastCostChangeModel extends Model{

    static DefaultState: ILastCostChangeProposal = DEFAULT_STATE

    constructor(state: ILastCostChangeProposal = DEFAULT_STATE, options: any){
        super(state, options)
    }

    get = () => {
        return {
            createdAt: (): Date => this.state.created_at,
            price: (): number => this.state.price,
            index: (): number => this.state.index,
            pubkh: (): string => this.state.pubkh,
        }
    }
}