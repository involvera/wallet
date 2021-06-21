import { Model, Collection } from "acey";
import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IThread } from "./interfaces";
import axios from 'axios'
import config from '../config'

export class Thread extends Model {

    static NewContent = (sid: number, title: string, content: string, public_key: string, signature: string): Thread => {
        return new Thread({sid, content, title, signature, public_key} as any, {})
    }

    constructor(state: IThread, options: any){
        super(state, options) 
        this.setState({
            link: new ContentLink(state.link, this.kids())
        })
    }
    
    broadcast = async () => {
        try {
            const json = this.to().plain()
            const res = await axios(config.getRootAPIContentUrl() + '/thread/', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                data: json,
                timeout: 10_000
            })
            if (res.status == 201){
                const json = await res.data()
                this.setState(json)
            }
            return res
        } catch (e){
            throw new Error(e)
        }
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