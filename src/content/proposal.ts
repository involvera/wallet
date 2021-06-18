import { Collection, Model } from "acey";
import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IProposal, IVote, TLayer } from "./interfaces";

export class Proposal extends Model {

    constructor(state: IProposal, options: any){
        super(state, options) 
        this.setState({
            link: new ContentLink(state.link, this.kids())
        })
    }

    get = () => {
        const link = (): ContentLink => this.state.link
        const societyID = (): number => this.state.sid
        const id = () => link().get().output().get().contentUUID()
        const embedData = (): IEmbedData => this.state.embed_data
        const costs = () => link().get().output().get().script().parse().proposalCosts()
        const constitution = () => link().get().output().get().script().parse().constitution()
        const author = (): IAuthor => this.state.author
        const content = (): string[3] => this.state.content 
        const title = (): string => this.state.title
        const created_at = (): Date => this.state.created_at 
        const vote = (): IVote => this.state.vote



        const layer = (): TLayer => {
            const is = link().get().output().get().script().is()
            if (is.costProposalScript())
                return 'Economy'
            if (is.constitutionProposalScript())
                return 'Constitution'
            return 'Application'
        }

        return {
            link, id, embedData, costs, constitution,
            author, content, title, layer, created_at, 
            vote, societyID
        }
    }
}

export class ProposalList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Proposal, ProposalList], options)
    }
}