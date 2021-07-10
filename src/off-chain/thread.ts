import axios from 'axios'
import * as bip32 from 'bip32'
import { Model, Collection } from "acey";
import { BuildSignatureHex } from 'wallet-util'

import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IThread } from "./interfaces";
import config from '../config'
import { T_FETCHING_FILTER } from '../constant/off-chain';

export class Thread extends Model {

    static NewContent = (sid: number, title: string, content: string): Thread => {
        return new Thread({sid, content, title} as any, {})
    }

    constructor(state: IThread, options: any){
        super(state, options) 
        this.setState({
            content_link: !state.content_link ? null : new ContentLink(state.content_link, this.kids())
        })
    }

    sign = (wallet: bip32.BIP32Interface) => {
        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().content()))
        this.setState({
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        })
    }
    
    broadcast = async (wallet: bip32.BIP32Interface) => {
        try {
            this.sign(wallet)
            const json = this.to().plain()
            !json.title && delete json.title
            const res = await axios(config.getRootAPIOffChainUrl() + '/thread', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                data: json,
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            res.status == 201 && this.setState(res.data)
            return res
        } catch (e){
            throw new Error(e)
        }
    }

    get = () => {
        const societyID = (): number => this.state.sid
        const contentLink = (): ContentLink | null => this.state.content_link
        const embedData = (): IEmbedData => this.state.embed_data
        const author = (): IAuthor => this.state.author
        const title = (): string => this.state.title
        const content = (): string => this.state.content
        const createdAt = (): Date => this.state.created_at

        return {
            contentLink, embedData, author, title,
            content, createdAt, societyID
        }
    }
}

export class ThreadList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Thread, ThreadList], options)
    }

    pullLastThreads = async (societyID: number, page: number, filter: T_FETCHING_FILTER) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/thread/${societyID}`,  {
                headers: {
                    page: page,
                    filter
                },
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const data = res.data
                for (let i = 0; i < data.length; i++){
                    if (!this.find({public_key_hashed: data[i].public_key_hashed})){
                        this.push(data[i])
                    }
                }
                this.save().store()
            }
        } catch (e){
            return e.toString()
        }
    }

}