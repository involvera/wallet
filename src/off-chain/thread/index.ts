import axios from 'axios'
import { IHeaderSignature, IKindLinkUnRaw, IThreadReward  } from 'community-coin-types'
import * as bip32 from 'bip32'
import { Buffer } from 'buffer'
import { Model, Collection } from "acey";
import { BuildSignatureHex } from 'wallet-util'
import { KindLinkModel } from "../../transaction";
import config from '../../config'
import { AliasModel, IAlias } from '../alias';
import { ThreadRewardModel } from './thread-rewards'
import { SocietyModel } from '../society';
import { IParsedPreview, StringToParsedPreview } from 'involvera-content-embedding';
import { IProposal, ProposalModel } from '../proposal';

export interface IPreviewThread {
    preview_code: string
    content_link: IKindLinkUnRaw
    reward: IThreadReward
    reply_count: number
}

export interface IThread {
    sid: number
    content_link?: IKindLinkUnRaw
    author?: IAlias
    title: string
    content: string
    public_key_hashed: string
    reward?: IThreadReward
    embeds?: string[]
    created_at?: Date
    target: IThread | IProposal | null
}

const DEFAULT_STATE: IThread = {
    sid: 0,
    content_link: KindLinkModel.DefaultState,
    author: AliasModel.DefaultState,
    title: '',
    content: '',
    public_key_hashed: "",
    reward: ThreadRewardModel.DefaultState,
    embeds: [],
    created_at: new Date(),
    target: null
}

export class ThreadModel extends Model {

    static DefaultState: IThread = DEFAULT_STATE

    static FetchByPKH = async (societyID: number, pubkh: string, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/thread/${societyID}/${pubkh}`,  {
                timeout: 10_000,
                headers: headerSig || {},
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const { data } = res
                const th = new ThreadModel(data[0], {})
                const tgt = data.length == 2 ? new ThreadModel(data[1], {}) : null
                tgt && th.setState({target: tgt})
                return th
            }
        } catch (e: any){
            throw new Error(e.toString())
        }
        return null
    }

    static NewContent = (sid: number, title: string, content: string): ThreadModel => {
        return new ThreadModel({sid, content, title} as any, {})
    }

    static NewTarget = (target: IThread | IProposal | null): ThreadModel | ProposalModel | null => {
        if (!target)
            return null
        if ((target as any).index)
            return new ProposalModel(target as any, {})
        else 
            return new ThreadModel(target as any, {})
    }

    static NewPreviewTarget = (target: IParsedPreview | null): ThreadModel | ProposalModel | null => {
        if (!target)
            return null
        if (target.index){
            const p = new ProposalModel({
                sid: target.sid,
                author: target.author,
                title: target.title,
                index: target.index,
                layer: (target as any).layer,
                created_at: typeof target.created_at == 'number' ? new Date(target.created_at * 1000) : new Date(target.created_at),
                vote: target.vote
            } as any, {})
            return p
        } else if (target.pkh) {
            let t = ThreadModel.NewPreviewTarget(target.target as any)
            if (t != null)
                t = t.to().plain()
            return new ThreadModel({
                author: target.author,
                public_key_hashed: target.pkh,
                created_at: typeof target.created_at == 'number' ? new Date(target.created_at * 1000) : new Date(target.created_at),
                target: t,
                title: target.title ? target.title : '',
                content: target.title ? '' : target.content,
                sid: target.sid,
            } as any, {})
        }
        return null
    }

    constructor(state: IThread = DEFAULT_STATE, options: any){
        super(state, options) 
        this.setState(Object.assign(state, { 
            content_link: !!state.content_link ? new KindLinkModel(state.content_link, this.kids()) : null,
            author: !!state.author ? new AliasModel(state.author, this.kids()) : null,
            reward: !!state.reward ? new ThreadRewardModel(state.reward, this.kids()) : null,
            created_at: !!state.created_at ? new Date(state.created_at) : undefined,
            target: !!state.target ? ThreadModel.NewTarget(state.target) : null 
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
            const state = res.data as IThread
            res.status == 201 && this.setState(Object.assign(state, { 
                content_link: new KindLinkModel(state.content_link, this.kids()),
                author: new AliasModel(state.author, this.kids()),
                reward: new ThreadRewardModel(state.reward, this.kids()),
                created_at: new Date(state.created_at as Date),
                target: ThreadModel.NewTarget(state.target)
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

        const replyCount = (): number => this.state.reply_count
        const embeds = (): string[] => this.state.embeds || []
        const author = (): AliasModel => this.state.author
        const title = (): string => this.state.title
        const content = (): string => this.state.content
        const createdAt = (): Date => this.state.created_at
        const pubKH = (): string => this.state.public_key_hashed
        const reward = (): ThreadRewardModel => this.state.reward
        const target = (): ThreadModel | ProposalModel | null => this.state.target

        return {
            contentLink, replyCount, embeds, author, title,
            content, createdAt, societyID,
            pubKH, reward, target,
        }
    }
}

export class ThreadCollection extends Collection {

    private _currentSociety: SocietyModel | null = null
    private _pageFetched = 0    
    private _maxReached = false
    private _targetPKH: string = ''

    constructor(initialState: any, options: any){
        super(initialState, [ThreadModel, ThreadCollection], options)
    }

    private _shouldStopExecution = (disablePageSystem: void | boolean) => this._maxReached == true && disablePageSystem != true
    private _throwErrorIfNoSocietySet = () => {
        if (!this._currentSociety){
            throw new Error("You need to set the current used Society through the method 'setSociety' first.")
        }
    }

    private _throwErrorIfNoTargetPKHSet = () => {
        if (!this._currentSociety){
            throw new Error("You need to set the target public key hashed through the method 'setTargetPKH' first.")
        }
    }

    private _updateFetchingInternalData = (jsonLength: number, max: number, disablePageSystem: void | boolean) => {
        if (disablePageSystem != true){
            if (jsonLength < max){
                this._maxReached = true
            }
            this._pageFetched += 1
        }
    }

    setSociety = (s: SocietyModel) => {
        this._currentSociety = s
    }

    setTargetPKH = (target: string) =>{ 
        this._targetPKH = target
        this._pageFetched = 0
        this._maxReached = false
    }

    public fetchFullReplies = async (headerSignature: IHeaderSignature, disablePageSystem: void | boolean) => {
        const MAX_PER_PAGE = 5

        if (this._shouldStopExecution(disablePageSystem))
            return 200

        this._throwErrorIfNoSocietySet()
        this._throwErrorIfNoTargetPKHSet()

        try {
            const response = await axios(config.getRootAPIOffChainUrl() + `/thread/replies/${this._currentSociety?.get().id()}/${this._targetPKH}`, {
                method: 'GET',
                headers: Object.assign({}, headerSignature as any, {
                    offset: disablePageSystem == true ? 0 : this._pageFetched * MAX_PER_PAGE
                }),
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            })
            if (response.status == 200){
                const json = (response.data || []) as any[]
                this._updateFetchingInternalData(json.length, MAX_PER_PAGE, disablePageSystem)
                this.add(new ThreadCollection(json, {}))
            }
        } catch (e: any){
            throw new Error(e)
        }
    }

    fetch = async (headerSignature: IHeaderSignature, disablePageSystem: void | boolean) => {
        const MAX_PER_PAGE = 10

        if (this._shouldStopExecution(disablePageSystem))
            return 200

        this._throwErrorIfNoSocietySet()

        try {
            const response = await axios(config.getRootAPIOffChainUrl() + `/thread/${this._currentSociety?.get().id()}`, {
                method: 'GET',
                headers: Object.assign({}, headerSignature as any, {
                    offset: disablePageSystem == true ? 0 : this._pageFetched * MAX_PER_PAGE,
                    target_pkh: this._targetPKH
                }),
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (response.status == 200){
                const json = (response.data || []) as IPreviewThread[]
                this._updateFetchingInternalData(json.length, MAX_PER_PAGE, disablePageSystem)
                const list = new ThreadCollection([], {})
                for (const o of json){
                    const preview = StringToParsedPreview(o.preview_code)
                    const target = ThreadModel.NewPreviewTarget(preview.target as any)
                    list.push({
                        public_key_hashed: preview.pkh,
                        author: preview.author,
                        created_at: new Date(preview.created_at * 1000),
                        target: target ? target.to().plain() : null,
                        title: preview.title,
                        content: preview.content,
                        sid: preview.sid,
                        reward: o.reward,
                        content_link: o.content_link,
                        reply_count: o.reply_count
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