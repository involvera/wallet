import { Model } from 'acey' 

export interface ILink {
    from: string
    to: string
}

export const DEFAULT_VALUE: ILink = {
    from: '',
    to: ''
}

export class LinkModel extends Model {

    static DefaultState: ILink = DEFAULT_VALUE

    constructor(state: ILink, options: any){
        super(state, options)
    }

    get = () => {
        return {
            from: (): string => this.state.from,
            to: (): string => this.state.to
        }
    }
}