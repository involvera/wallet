import axios from 'axios'
import * as bip32 from 'bip32'
import { Model, Collection } from "acey";
import { BuildSignatureHex } from 'wallet-util'
import { ContentLinkModel, IContentLink, DEFAULT_STATE as DEFAULT_LINK_STATE } from "../transaction";
import config from '../config'
import { AliasModel, IAlias, DEFAULT_STATE as DEFAULT_ALIAS_STATE } from './alias';

export interface IThread {
    sid: number
    content_link?: IContentLink
    author?: IAlias
    title: string
    content: string
    embed_data?: string[]
    created_at?: Date
}

export const DEFAULT_STATE: IThread = {
    sid: 0,
    content_link: DEFAULT_LINK_STATE,
    author: DEFAULT_ALIAS_STATE,
    title: '',
    content: '',
    embed_data: [],
    created_at: new Date()
}

export class ThreadModel extends Model {

    static FetchByPKH = async (societyID: number, pubkh: string) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/thread/${societyID}/${pubkh}`,  {
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const { data } = res
                return new ThreadModel(data, {})
            }
        } catch (e){
            throw new Error(e.toString())
        }
        return null
    }

    static NewContent = (sid: number, title: string, content: string): ThreadModel => {
        return new ThreadModel({sid, content, title} as any, {})
    }

    constructor(state: IThread = DEFAULT_STATE, options: any){
        super(state, options) 
        this.setState({
            content_link: new ContentLinkModel(state.content_link as any, this.kids()),
            author: new AliasModel(state.author, this.kids())
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
        const contentLink = (): ContentLinkModel | null => this.state.content_link
        const embedData = (): string[] => this.state.embed_data
        const author = (): AliasModel => this.state.author
        const title = (): string => this.state.title
        const content = (): string => this.state.content
        const createdAt = (): Date => this.state.created_at

        return {
            contentLink, embedData, author, title,
            content, createdAt, societyID
        }
    }
}

export class ThreadCollection extends Collection {

    static FetchLastThreads = async (societyID: number, page: number) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/thread/${societyID}`,  {
                headers: {
                    page: page
                },
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return new ThreadCollection(res.data, {})
            }
        } catch (e){
            throw new Error(e)
        }
    }

    constructor(initialState: any, options: any){
        super(initialState, [ThreadModel, ThreadCollection], options)
    }
}