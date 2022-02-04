import moment from 'moment'
import axios from 'axios'
import { Buffer } from 'buffer'
import * as bip32 from 'bip32'
import { Collection, Model } from "acey";
import { IConstitutionProposalUnRaw, ICostProposal, IUserVote, IUserVoteProposal, IKindLinkUnRaw,IVoteSummary } from 'community-coin-types'
import { BuildSignatureHex } from 'wallet-util'
import config from "../../config";
import { KindLinkModel } from '../../transaction/kind-link'
import { IAlias, AliasModel  } from '../alias'
import {VoteModel, } from './vote'
import { UserVoteModel } from './user-vote'
import { LUGH_EVERY_N_S } from '../../constant';
import { IHeaderSignature } from '../../wallet';

export type TLayer = 'Economy' | 'Application' | 'Constitution'

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
            content_link: new KindLinkModel(state.content_link, this.kids()),
            vote: new VoteModel(state.vote, this.kids()),
            author: new AliasModel(state.author, this.kids()),
            user_vote: state.user_vote ? new UserVoteModel(state.user_vote, this.kids()) : null,
        }))
    }

    setUserVote = (uVote: IUserVote) => {
        return this.setState({
            user_vote: new UserVoteModel(uVote, this.kids())
        })
    }
    
    sign = (wallet: bip32.BIP32Interface) => {
        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().dataToSign()))
        this.setState({
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        })
    }

    broadcast = async (wallet: bip32.BIP32Interface) => {
            this.sign(wallet)
            const json = this.to().plain()
            json.content = this.get().dataToSign()
            try {
                const res = await axios(`${config.getRootAPIOffChainUrl()}/proposal`, {
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(json),
                    timeout: 10_000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                res.status == 201 && this.hydrate(res.data)
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
        const contentLink = (): KindLinkModel => this.state.content_link
        const societyID = (): number => this.state.sid
        const embeds = (): string[] => this.state.embeds

        const estimatedEndAtTime = () => {
            const begin = this.get().createdAt().getTime()
            const beginLH = this.get().contentLink().get().lh()
            const endLH = this.get().vote().get().closedAtLH()

            return begin + ((endLH - beginLH) * 1000 * LUGH_EVERY_N_S)
        }

        const endAtLH = () => this.get().vote().get().closedAtLH()

        const costs = () => { 
            const content = contentLink()
            if (content == null)
                throw new Error("content_link is null")
            return content.get().output().get().script().parse().proposalCosts()
        }

        const constitution = () => {
            const content = contentLink()
            if (content == null)
                throw new Error("content_link is null")
            return content.get().output().get().script().parse().constitution()
        }

        const author = (): AliasModel => this.state.author
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
            const content = contentLink()
            if (content == null)
                throw new Error("content_link is null")
            const is = content.get().output().get().script().is()
            if (is.costProposalScript())
                return 'Economy'
            if (is.constitutionProposalScript())
                return 'Constitution'
            return 'Application'
        }
        const pubKH = (): string => this.state.public_key_hashed
        const pubKHOrigin = ():string => this.state.pubkh_origin

        const context = (): ICostProposal | IConstitutionProposalUnRaw | null => {
            if (this.get().content()){
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

    static FetchLastProposal = async (societyID: number, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}/last`,  {
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

    static FetchLastProposals = async (societyID: number, page: number, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}`, {
                headers: Object.assign({}, {page}, headerSig ? headerSig : {}),
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200)
                return new ProposalCollection(res.data, {})
        } catch (e: any){
            throw new Error(e.toString())
        }
    }

    constructor(initialState: any, options: any){
        super(initialState, [ProposalModel, ProposalCollection], options)
    }

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

    sortByIndexDesc = (): ProposalCollection => this.orderBy('index', 'desc') as ProposalCollection

    add = (node: ProposalModel | ProposalCollection) => {        
        const addNode = (n: ProposalModel) => {
            const idx = this.findIndex({index: n.get().index()})
            if (idx == -1)
                this.push(n.to().plain())
            else
                this.updateAt(n.to().plain(), idx)            
        }
        node instanceof ProposalModel ? addNode(node) : node.forEach((p: ProposalModel) => addNode(p))
        return this.action()  
    }
}