import axios from 'axios'
import { IHeaderSignature, IKindLinkUnRaw, IReactionCount  } from 'community-coin-types'
import * as bip32 from 'bip32'
import { Buffer } from 'buffer'
import { Model, Collection } from "acey";
import { BuildSignatureHex } from 'wallet-util'
import { KindLinkModel } from "../../transaction";
import config from '../../config'
import { AliasModel, IAlias } from '../alias';
import { RewardsModel } from './rewards'
import { SocietyModel } from '../society';
import { IParsedPreview, StringToParsedPreview } from 'involvera-content-embedding';

export interface IPreviewThread{
    preview_code: string
    reaction: IReactionCount
}

export interface IThread {
    sid: number
    content_link?: IKindLinkUnRaw
    author?: IAlias
    title: string
    content: string
    public_key_hashed: string
    reaction?: IReactionCount
    embeds?: string[]
    created_at?: Date
    target: IParsedPreview | null
}

const DEFAULT_STATE: IThread = {
    sid: 0,
    content_link: KindLinkModel.DefaultState,
    author: AliasModel.DefaultState,
    title: '',
    content: '',
    public_key_hashed: "",
    reaction: RewardsModel.DefaultState,
    embeds: [],
    created_at: new Date(),
    target: null
}

export class ThreadModel extends Model {

    static DefaultState: IThread = DEFAULT_STATE

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
        } catch (e: any){
            throw new Error(e.toString())
        }
        return null
    }

    static NewContent = (sid: number, title: string, content: string): ThreadModel => {
        return new ThreadModel({sid, content, title} as any, {})
    }

    constructor(state: IThread = DEFAULT_STATE, options: any){
        super(state, options) 
        this.setState(Object.assign(state, { 
            content_link: state.content_link ? new KindLinkModel(state.content_link, this.kids()) : null,
            author: state.author ? new AliasModel(state.author, this.kids()) : null,
            rewards: state.reaction ? new RewardsModel(state.reaction, this.kids()) : null,
            created_at: state.created_at ? new Date(state.created_at) : undefined
        }))
    }

    sign = (wallet: bip32.BIP32Interface) => {
        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().content()))
        return {
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        }
    }
    
    broadcast = async (wallet: bip32.BIP32Interface) => {
        try {
            this.sign(wallet)
            const body = Object.assign({
                title: this.get().title(),
                content: this.get().content(),
                sid: this.get().societyID(),
            }, this.sign(wallet))

            const res = await axios(config.getRootAPIOffChainUrl() + '/thread', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                data: JSON.stringify(body),
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            const state = res.data
            res.status == 201 && this.setState(Object.assign(state, { 
                content_link: new KindLinkModel(state.content_link, this.kids()),
                author: new AliasModel(state.author, this.kids()),
                rewards: new RewardsModel(state.reaction_count, this.kids()),
                created_at: new Date(state.created_at)
            }))
            return res
        } catch (e: any){
            throw new Error(e)
        }
    }

    get = () => {
        const societyID = (): number => this.state.sid
        
        const contentLink = (): KindLinkModel => {
            if (this.state.content_link == null)
                throw new Error("content_link is null")
            return this.state.content_link
        }

        const embeds = (): string[] => this.state.embeds || []
        const author = (): AliasModel => this.state.author
        const title = (): string => this.state.title
        const content = (): string => this.state.content
        const createdAt = (): Date => this.state.created_at
        const pubKH = (): string => this.state.public_key_hashed
        const rewards = (): RewardsModel => this.state.rewards

        return {
            contentLink, embeds, author, title,
            content, createdAt, societyID,
            pubKH, rewards
        }
    }
}

export class ThreadCollection extends Collection {

    private _currentSociety: SocietyModel | null = null
    private _pageFetched = 0    
    private _maxReached = false

    constructor(initialState: any, options: any){
        super(initialState, [ThreadModel, ThreadCollection], options)
    }

    setSociety = (s: SocietyModel) => {
        this._currentSociety = s
    }    

    fetch = async (headerSignature: IHeaderSignature, disablePageSystem: void | boolean) => {
        const MAX_PER_PAGE = 10

        if (this._maxReached == true && disablePageSystem != true){
            return 200
        }

        if (!this._currentSociety){
            throw new Error("You need to set the current used Society through the method 'setSociety' first.")
        }

        try {
            const response = await axios(config.getRootAPIOffChainUrl() + `/thread/${this._currentSociety.get().id()}`, {
                method: 'GET',
                headers: Object.assign({}, headerSignature as any, {
                    offset: disablePageSystem == true ? 0 : this._pageFetched * MAX_PER_PAGE
                }),
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (response.status == 200){
                const json = (response.data || []) as IPreviewThread[]
                if (disablePageSystem != true){
                    if (json.length < MAX_PER_PAGE){
                        this._maxReached = true
                    }
                    this._pageFetched += 1
                }
                const list = new ThreadCollection([], {})
                for (const o of json){
                    const preview = StringToParsedPreview(o.preview_code)
                    list.push({
                        public_key_hashed: preview.pkh,
                        author: preview.author,
                        created_at: new Date(preview.created_at * 1000),
                        target: preview.target,
                        title: preview.title,
                        content: preview.content,
                        sid: preview.sid,
                        reaction: o.reaction
                    })
                }
                this.add(list)
            }
            return response.status
        } catch (e: any){
            throw new Error(e)
        }
    }

        add = (node: ThreadModel | ThreadCollection) => {        
            const addNode = (n: ThreadModel) => {
                const idx = this.findIndex({public_key_hashed: n.get().pubKH()})
                if (idx == -1)
                    this.push(n.to().plain())
                else
                    this.updateAt(n.to().plain(), idx)            
            }
            node instanceof ThreadModel ? addNode(node) : node.forEach((p: ThreadModel) => addNode(p))
            return this.action()
        }
}