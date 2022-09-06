import moment from 'moment'
import axios from 'axios'
import { Collection, Model } from "acey";
import { 
    IConstitutionProposalUnRaw, ICostProposal, IUserVote, 
    IKindLinkUnRaw,IVoteSummary, IContentLink 
} from 'community-coin-types'
import { StringToParsedPreview } from 'involvera-content-embedding'
import { Constant } from 'wallet-script'
import { TProposalType } from 'wallet-script/dist/src/content-code'
import { Inv } from 'wallet-util'

import config from "../../config";
import { KindLinkModel } from '../../transaction/kind-link'
import { IAlias, AliasModel  } from '../alias'
import {VoteModel, } from './vote'
import { UserVoteModel } from './user-vote'
import { COUNT_DEFAULT_PROPOSALS, LUGH_EVERY_N_S, N_LUGH_VOTE_DURATION } from '../../constant';
import { IHeaderSignature } from '../../wallet';
import { SocietyModel } from '../society';
import { Transaction } from '../../..';

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
    pubkh_origin: '',
    user_vote: UserVoteModel.DefaultState
}

export class ProposalModel extends Model {

    static DefaultState: IProposal = DEFAULT_STATE

    static FetchByIndex = async (societyID: number, index: number, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}/${index}`,  {
                timeout: 10_000,
                headers: Object.assign({'content-type': 'application/json'}, headerSig || {}),
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

    constructor(state: IProposal = DEFAULT_STATE, options: any){
        super(state || DEFAULT_STATE, options) 
        state && this.setState(Object.assign(state, { 
            content_link: state.content_link ? new KindLinkModel(state.content_link, this.kids()) : null,
            vote: state.vote ? new VoteModel(state.vote, this.kids()) : null, 
            author: new AliasModel(state.author, this.kids()),
            user_vote: state.user_vote ? new UserVoteModel(state.user_vote, this.kids()) : null,
            created_at: state.created_at ? new Date(state.created_at) : undefined
        }))
    }

    setUserVote = (uVote: IUserVote) => {
        return this.setState({
            user_vote: new UserVoteModel(uVote, this.kids())
        })
    }

    broadcast = async (wallet: Inv.PrivKey) => {
        const body = Object.assign({
            title: this.get().title(),
            content:  this.get().dataToSign(),
            sid: this.get().societyID(),
        }, wallet.sign(this.get().dataToSign()).get().plain())

        try {
            const res = await axios(`${config.getRootAPIOffChainUrl()}/proposal`, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(body),
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status <= 500;
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
        const genesis = () => this.get().index() <= COUNT_DEFAULT_PROPOSALS


        return { over, approved, declined, genesis }
    }

    get = () => {
        const index = (): number => this.state.index
        const contentLink = (): KindLinkModel => {
            if (this.state.content_link == null)
                throw new Error("content_link is null")
            return this.state.content_link
        }
        const societyID = (): number => this.state.sid

        const estimatedEndAtTime = () => {
            if (this.is2().genesis()){
                return this.get().createdAt()
            }
            const begin = this.get().createdAt().getTime()
            return new Date(begin + ((N_LUGH_VOTE_DURATION) * LUGH_EVERY_N_S * 1000))
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
                return formatToLayer(content.get().output().get().script().typeD2() as TProposalType)
            } catch (e){
                const { layer } = this.state
                if (!layer)
                    contentLink() //will throw an error if no layer key set
                return formatToLayer(layer)
            }
        }

        const pubKH = () => this.state.public_key_hashed ? Inv.PubKH.fromHex(this.state.public_key_hashed) : null
        const pubKHOrigin = () => this.state.pubkh_origin ? Inv.PubKH.fromHex(this.state.pubkh_origin) : null

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
            contentLink, costs, constitution,
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
    private _proposalsFetched = 0

    constructor(initialState: any, options: any){
        super(initialState, [ProposalModel, ProposalCollection], options)
    }

    reset = () => {
        this._pageFetched = 0
        this._proposalsFetched = 0
        this._maxReached = false
        this._currentSociety = null
        return this.setState([])
    }

    setSociety = (s: SocietyModel) => {
        this._pageFetched = 0
        this._proposalsFetched = 0
        this._maxReached = false
        this._currentSociety = s
    }

    private _throwErrorIfNoSocietySet = () => {
        if (!this._currentSociety){
            throw new Error("You need to set the current used Society through the method 'setSociety' first.")
        }
    }

    private _fetchGenesisProposalsIfRequired = async () => {
        if (this._maxReached == true || (this.sortByIndexAsc().nodeAt(0) as ProposalModel).get().index() === (COUNT_DEFAULT_PROPOSALS + 1)){
            await this.fetchGenesisProposals()
        }
    }

    private _incrementProposalsFetched = (n: number) => this._proposalsFetched += n
    public countProposalsFetched = () => this._proposalsFetched


    public fetchGenesisProposals = async () => {
        this._throwErrorIfNoSocietySet()

        if (this.getByIndex(COUNT_DEFAULT_PROPOSALS)){
            return 200
        }
    
        try {
            const response = await axios(config.getRootAPIChainUrl() + `/proposals/genesis`, {
                timeout: 10000,
                headers: { 'content-type': 'application/json' },
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (response.status == 200){
                const list = new ProposalCollection([], {})
                const json = (response.data || []) as IContentLink[]
                for (const o of json){
                    const link = new Transaction.KindLinkModel(o.link, {})
                    const t = link.get().output().get().script().typeD2()

                    list.push({
                        sid: this._currentSociety?.get().id() as number,
                        content_link: o.link,
                        index: o.index,
                        created_at: this._currentSociety?.get().created_at() as Date,
                        public_key_hashed: link.get().output().get().contentPKH().hex(),
                        title: `Genesis ${t?.toLowerCase()}`,
                        content: ['', '', ''],
                        author: {address: Inv.Address.random().get(), pp: '/images/involvera.png', username: 'involvera'},
                        pubkh_origin: Constant.PUBKEY_H_BURNER,
                        user_vote: null,
                        vote: {closed_at_lh: 1, approved: 1, declined: 0},
                    })
                }
                this.add(list)
            }
            return response.status
        } catch (e: any){
            throw new Error(e)
        }
    }

    fetch = async (headerSignature: IHeaderSignature, disablePageSystem: void | boolean) => {
        const MAX_PER_PAGE = 5
        
        this._throwErrorIfNoSocietySet()

        if (this._maxReached == true && disablePageSystem != true){
            await this._fetchGenesisProposalsIfRequired()
            return 200
        }

        try {
            const response = await axios(config.getRootAPIOffChainUrl() + `/proposal/${this._currentSociety?.get().id()}`, {
                method: 'GET',
                headers: Object.assign({'content-type': 'application/json'}, headerSignature as any, {
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
                        author: preview.author,
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
                this._incrementProposalsFetched(list.count())
                await this._fetchGenesisProposalsIfRequired()
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

    getByIndex = (proposalIndex: number) => this.find((p: ProposalModel) => p.get().index() === proposalIndex) as ProposalModel

    sortByIndexDesc = (): ProposalCollection => this.orderBy('index', 'desc') as ProposalCollection
    sortByIndexAsc = (): ProposalCollection => this.orderBy('index', 'asc') as ProposalCollection

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