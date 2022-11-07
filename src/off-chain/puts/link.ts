import { Model } from 'acey' 
import { ONCHAIN } from 'community-coin-types'

const DEFAULT_VALUE: ONCHAIN.ILink = {
    from: '',
    to: ''
}

export class LinkModel extends Model {

    static DefaultState: ONCHAIN.ILink = DEFAULT_VALUE

    constructor(state: ONCHAIN.ILink, options: any){
        super(state, options)
    }

    get = () => {
        return {
            from: (): string | number => {
                if (isNaN(this.state.from))
                    return this.state.from as string
                return parseInt(this.state.from)
            },
            to: (): string | number => {
                if (isNaN(this.state.to))
                    return this.state.to as string
                return parseInt(this.state.to)    
            }
        }
    }
}