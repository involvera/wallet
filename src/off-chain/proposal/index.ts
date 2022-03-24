import moment from 'moment'
import axios from 'axios'
import { Buffer } from 'buffer'
import * as bip32 from 'bip32'
import { Collection, Model } from "acey";
import { BuildSignatureHex } from 'wallet-util'
import { 
    IConstitutionProposalUnRaw, ICostProposal, IUserVote, 
    IKindLinkUnRaw,IVoteSummary 
} from 'community-coin-types'
import { StringToParsedPreview } from 'involvera-content-embedding'
import { TProposalType } from 'wallet-script'

import config from "../../config";
import { KindLinkModel } from '../../transaction/kind-link'
import { IAlias, AliasModel  } from '../alias'
import {VoteModel, } from './vote'
import { UserVoteModel } from './user-vote'
import { LUGH_EVERY_N_S } from '../../constant';
import { IHeaderSignature } from '../../wallet';
import { SocietyModel } from '../society';

export type TLayer = 'Economy' | 'Application' | 'Constitution'

export interface IPreviewProposal {
    preview_code: string
    user_vote: IUserVote
    vote: IVoteSummary
}

export interface IProposal {
    sid: number
    content_link: IKindLinkUnRaw
    vote: IVoteSummary
    index: number
    created_at: Date
    public_key_hashed: string
    title: string,
    content: string[3]
    author: IAlias
    embeds: string[]
    pubkh_origin: string
    user_vote: IUserVote | null
}

const DEFAULT_STATE: IProposal = {
    sid: 0,
    content_link: KindLinkModel.DefaultState,
    vote: VoteModel.DefaultState,
    index: 0,
    created_at: new Date(),
    public_key_hashed: '',
    title: '',
    content: ['','',''] as any,
    author: AliasModel.DefaultState,
    embeds: [],
    pubkh_origin: '',
    user_vote: UserVoteModel.DefaultState
}

export class ProposalModel extends Model {

    static DefaultState: IProposal = DEFAULT_STATE

    static FetchByIndex = async (societyID: number, index: number, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}/${index}`,  {
                timeout: 10_000,
                headers: headerSig || {},
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const { data } = res
                return new ProposalModel(data, {})
            }
        } catch (e: any){
            throw new Error(e.toString())
        }
    }

    static NewContent = (sid: number, title: string, content: string[]): ProposalModel => {
        if (content.length < 3 || content.length > 4){
            throw new Error("Wrong proposal contents length")
        }
        return new ProposalModel({sid, content, title} as any, {})
    }

    constructor(state: undefined | null | IProposal = DEFAULT_STATE, options: any){
        super(state, options) 
        state && this.setState(Object.assign(state, { 
            content_link: state.content_link ? new KindLinkModel(state.content_link, this.kids()) : null,
            vote: state.vote ? new VoteModel(state.vote, this.kids()) : null, 
            author: state.author ? new AliasModel(state.author, this.kids()) : null,
            user_vote: state.user_vote ? new UserVoteModel(state.user_vote, this.kids()) : null,
            created_at: state.created_at ? new Date(state.created_at) : undefined
        }))
    }

    setUserVote = (uVote: IUserVote) => {
        return this.setState({
            user_vote: new UserVoteModel(uVote, this.kids())
        })
    }
    
    sign = (wallet: bip32.BIP32Interface) => {
        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().dataToSign()))
        return {
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        }
    }

    broadcast = async (wallet: bip32.BIP32Interface) => {
            const body = Object.assign({
                title: this.get().title(),
                content:  this.get().dataToSign(),
                sid: this.get().societyID(),
            }, this.sign(wallet))

            try {
                const res = await axios(`${config.getRootAPIOffChainUrl()}/proposal`, {
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(body),
                    timeout: 10_000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                const state = res.data
                res.status == 201 && this.setState(Object.assign(state, {
                    content_link: new KindLinkModel(state.content_link, this.kids()),
                    vote: new VoteModel(state.vote, this.kids()), 
                    author: new AliasModel(state.author, this.kids()),
                    created_at: new Date(state.created_at)
                }))
                return res
            } catch (e: any){
                return e.toString()
            }
    }

    is2 = () => {
        const over = (currentLH: number) => this.get().vote().get().closedAtLH() <= currentLH || (this.get().vote().get().approved() > 0.5 || this.get().vote().get().declined() >= 0.5)
        const approved = (currentLH: number) => over(currentLH) && this.get().vote().get().approved() > 0.5
        const declined = (currentLH: number) => over(currentLH) && this.get().vote().get().approved() <= 0.5

        return { over, approved, declined }
    }

    get = () => {
        const index = (): number => this.state.index
        const contentLink = (): KindLinkModel => {
            if (this.state.content_link == null)
                throw new Error("content_link is null")
            return this.state.content_link
        }
        const societyID = (): number => this.state.sid
        const embeds = (): string[] => this.state.embeds || []

        const estimatedEndAtTime = () => {
            const begin = this.get().createdAt().getTime()
            const beginLH = this.get().contentLink().get().lh()
            const endLH = this.get().vote().get().closedAtLH()

            return begin + ((endLH - beginLH) * 1000 * LUGH_EVERY_N_S)
        }

        const endAtLH = () => this.get().vote().get().closedAtLH()

        const costs = () => { 
            const content = contentLink()
            return content.get().output().get().script().parse().proposalCosts()
        }

        const constitution = () => {
            const content = contentLink()
            return content.get().output().get().script().parse().constitution()
        }

        const author = (): AliasModel => {
            if (!this.state.author)
                throw new Error("author is null")
            return this.state.author
        }

        const content = (): string[] => this.state.content
        const title = (): string => this.state.title
        const createdAt = (): Date => new Date(this.state.created_at)

        const createdAtAgo = (): string => moment(createdAt()).fromNow()

        const createdAtPretty = (): string => {
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate()-1)
            const createDate = new Date(createdAt()) 

            const isSameYear = today.getFullYear() === createDate.getFullYear()
            const isToday = (now: Date, creation: Date) => creation.getDate() === now.getDate() && creation.getMonth() === now.getMonth() && creation.getFullYear() === now.getFullYear();

            if (isToday(today, createDate))
                return 'today'
            if (isToday(yesterday, createDate))
                return 'yesterday'

            return moment(createDate).format(`MMM Do ${isSameYear ? '' : 'YYYY'} `)
        }
        
        const vote = (): VoteModel => this.state.vote
                
        const dataToSign = (): string => this.get().content().join('~~~_~~~_~~~_~~~')

        const layer = (): TLayer => {
            const formatToLayer = (pt: TProposalType) => {
                const layer = pt as TProposalType
                if (layer === 'COSTS')
                    return 'Economy'
                return (layer.charAt(0).toUpperCase() + layer.slice(1).toLowerCase()) as TLayer
            }
            try {
                const content = contentLink()
                if (!content.get().output().get().script().is().proposalScript()){
                    throw new Error("Not a proposal")
                }
                return formatToLayer(content.get().output().get().script().proposalContentTypeString() as TProposalType)
            } catch (e){
                const { layer } = this.state
                if (!layer)
                    contentLink() //will throw an error if no layer key set
                return formatToLayer(layer)
            }
        }

        const pubKH = (): string => this.state.public_key_hashed
        const pubKHOrigin = ():string => this.state.pubkh_origin

        const context = (): ICostProposal | IConstitutionProposalUnRaw | null => {
            if (this.state.context){
                switch (this.get().layer()) {
                    case 'Economy':
                        return JSON.parse(this.state.context) as ICostProposal
                    case 'Constitution':
                        return JSON.parse(this.state.context) as IConstitutionProposalUnRaw
                }
            }
            return null
        }
        
        const userVote = (): UserVoteModel | null => this.state.user_vote

        return {
            index,
            contentLink, embeds, costs, constitution,
            author, content, title, layer, createdAt, 
            vote, societyID, dataToSign, 
            createdAtAgo, createdAtPretty, pubKH,
            pubKHOrigin, endAtLH, estimatedEndAtTime,
            userVote, context
        }
    }
}

export class ProposalCollection extends Collection {

    private _currentSociety: SocietyModel | null = null
    private _pageFetched = 0    
    private _maxReached = false

    constructor(initialState: any, options: any){
        super(initialState, [ProposalModel, ProposalCollection], options)
    }

    setSociety = (s: SocietyModel) => {
        this._currentSociety = s
    }

    fetch = async (headerSignature: IHeaderSignature, disablePageSystem: void | boolean) => {
        const MAX_PER_PAGE = 5

        if (this._maxReached == true && disablePageSystem != true){
            return 200
        }

        if (!this._currentSociety){
            throw new Error("You need to set the current used Society through the method 'setSociety' first.")
        }

        try {
            const response = await axios(config.getRootAPIOffChainUrl() + `/proposal/${this._currentSociety.get().id()}`, {
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
                const json = (response.data || []) as IPreviewProposal[]
                if (disablePageSystem != true){
                    if (json.length < MAX_PER_PAGE){
                        this._maxReached = true
                    }
                    this._pageFetched += 1
                }
                const list = new ProposalCollection([], {})
                for (const o of json){
                    const preview = StringToParsedPreview(o.preview_code)
                    list.push({
                        index: preview.index,
                        layer: preview.proposal_layer,
                        created_at: new Date(preview.created_at * 1000),
                        vote: o.vote,
                        user_vote: o.user_vote,
                        title: preview.title,
                        sid: preview.sid
                    })
                }
                this.add(list)
            }
            return response.status
        } catch (e: any){
            throw new Error(e)
        }
    }

    /*
    pullUserVotes = async (headerSig: IHeaderSignature) => {
        const list = this.filter((p: ProposalModel) => !p.get().userVote()).map((p: ProposalModel) => p.get().pubKH()).join(',')
        try {
            const res = await axios(config.getRootAPIChainUrl() + '/proposals/uvote', {
                headers: Object.assign({ list}, headerSig)
            })
            if (res.status == 200){
                const array = res.data as IUserVoteProposal[]
                for (const elem of array){
                    const m = this.find({public_key_hashed: elem.pubkh}) as ProposalModel
                    elem.user_vote && m.setState({ user_vote: new UserVoteModel(elem.user_vote, m.kids()) })
                }
                return this.action()
            } else 
                return res.data as string
        } catch (e: any){
            throw new Error(e.toString())
        }
    }
    */

    sortByIndexDesc = (): ProposalCollection => this.orderBy('index', 'desc') as ProposalCollection

    add = (elem: ProposalModel | ProposalCollection) => {        
        const addNode = (n: ProposalModel) => {
            const idx = this.findIndex({index: n.get().index()})
            if (idx == -1)
                this.push(n.to().plain())
            else
                this.updateAt(n.to().plain(), idx)            
        }
        elem instanceof ProposalModel ? addNode(elem) : elem.forEach((p: ProposalModel) => addNode(p))
        return this.action()  
    }
}