import { Model } from 'acey' 
import { ILink } from 'community-coin-types'

const DEFAULT_VALUE: ILink = {
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
            from: (): string | number => {
                if (isNaN(parseInt(this.state.from)))
                    return this.state.from as string
                return parseInt(this.state.from)
            },
            to: (): string | number => {
                if (isNaN(parseInt(this.state.to)))
                    return this.state.to as string
                return parseInt(this.state.to)    
            }
        }
    }
}