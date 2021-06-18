import { Model, Collection } from "acey";
import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IThread } from "./interfaces";

export class Thread extends Model {

    constructor(state: IThread, options: any){
        super(state, options) 
        this.setState({
            link: new ContentLink(state.link, this.kids())
        })
    }

    get = () => {
        const societyID = (): number => this.state.sid
        const link = (): ContentLink => this.state.link
        const id = () => link().get().output().get().contentUUID()
        const embedData = (): IEmbedData => this.state.embed_data
        const author = (): IAuthor => this.state.author
        const title = (): string => this.state.title
        const content = (): string => this.state.content
        const createdAt = (): Date => this.state.created_at

        return {
            link, id, embedData, author, title,
            content, createdAt, societyID
        }
    }
}

export class ThreadList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Thread, ThreadList], options)
    }
}