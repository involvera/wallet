import { Model } from 'acey'

export interface IContributorStats { 
    addr: string
    position: number
    sid: number
}

export class ContributorModel extends Model {

    constructor(state: IContributorStats, options: any){
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