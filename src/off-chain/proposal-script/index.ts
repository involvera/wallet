import { Model } from 'acey'
import { IScriptOrigin, OriginModel } from './origin'

export interface IScriptProposal {
    origin: IScriptOrigin
    pubkh: string
    content_nonce: number
}

export class ProposalScriptModel extends Model {

    constructor(state: IScriptProposal, options: any){
        super(state, options)
        this.setState({
            origin: new OriginModel(state.origin, this.kids())
        })
    }

    get = () =>{
        return {
            origin: (): OriginModel => this.state.origin,
            pubkh: (): string => this.state.pubkh,
            content_nonce: (): number => this.state.number
        }
    }
}