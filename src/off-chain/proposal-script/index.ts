// import { Model } from 'acey'
// import { IScriptOrigin, OriginModel, DEFAULT_STATE as ORIGIN_DEFAULT_STATE } from './origin'

// export interface IScriptProposal {
//     origin: IScriptOrigin
//     pubkh: string
//     content_nonce: number
// }

// export const DEFAULT_STATE: IScriptProposal = {
//     origin: ORIGIN_DEFAULT_STATE,
//     pubkh: '',
//     content_nonce: -1
// }

// export class ProposalScriptModel extends Model {

//     constructor(state: IScriptProposal = DEFAULT_STATE, options: any){
//         super(state, options)
//         this.setState({
//             origin: new OriginModel(state.origin, this.kids())
//         })
//     }

//     get = () =>{
//         return {
//             origin: (): OriginModel => this.state.origin,
//             pubkh: (): string => this.state.pubkh,
//             content_nonce: (): number => this.state.number
//         }
//     }
// }