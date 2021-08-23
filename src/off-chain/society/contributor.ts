import { Model } from 'acey'

export interface IContributorStats { 
    addr: string
    position: number
    sid: number
}

export const DEFAULT_STATE: IContributorStats = {
    addr: '',
    position: 0,
    sid: 0,
}

export class ContributorModel extends Model {

    constructor(state = DEFAULT_STATE, options: any){
        super(state, options)
    }

    get = () => {
        return {
            addr: (): string => this.state.addr,
            position: (): number => this.state.position,
            sid: (): number => this.state.sid
        }
    }
}