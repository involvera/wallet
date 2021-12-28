import moment from 'moment'
import axios from 'axios'
import * as bip32 from 'bip32'
import { Collection, Model } from "acey";
import { BuildSignatureHex } from 'wallet-util'
import config from "../../config";
import {  IKindLink, KindLinkModel, DEFAULT_STATE as DEFAULT_LINK_STATE } from '../../transaction/kind-link'
import { IAlias, AliasModel, DEFAULT_STATE as DEFAULT_ALIAS_STATE } from '../alias'
import {VoteModel, IVote, DEFAULT_STATE as DEFAULT_VOTE_STATE } from './vote'

export type TLayer = 'Economy' | 'Application' | 'Constitution'

export interface IProposal {
    sid: number
    content_link: IKindLink
    vote: IVote
    index: number
    created_at: Date
    public_key_hashed: string
    title: string,
    content: string[3]
    author: IAlias
    embeds: string[]
    pubkh_origin: string
}

export const DEFAUL_STATE: IProposal = {
    sid: 0,
    content_link: DEFAULT_LINK_STATE,
    vote: DEFAULT_VOTE_STATE,
    index: 0,
    created_at: new Date(),
    public_key_hashed: '',
    title: '',
    content: ['','',''] as any,
    author: DEFAULT_ALIAS_STATE,
    embeds: [],
    pubkh_origin: ''
}

export class ProposalModel extends Model {

    static FetchByIndex = async (societyID: number, index: number) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}/${index}`,  {
                timeout: 10_000,
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

    constructor(state: IProposal, options: any){
        super(state, options) 
        state && this.setState(Object.assign(state, { 
            content_link: new KindLinkModel(state.content_link, this.kids()),
            vote: new VoteModel(state.vote, this.kids()),
            author: new AliasModel(state.author, this.kids())
        }))
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
        const pending = (): boolean => this.get().vote().get().declined() == -1 
        const approved = (): boolean => pending() && this.get().vote().get().approved() > 50
        return {
            pending, approved
        }
    }

    get = () => {
        const index = (): number => this.state.index
        const contentLink = (): KindLinkModel => this.state.content_link
        const societyID = (): number => this.state.sid
        const embeds = (): string[] => this.state.embeds

        const endAt = () => this.get().vote().get().closed_at_lh()

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
        const created_at = (): number => (this.state.created_at as Date).getTime()

        const createdAtAgo = (): string => moment(new Date(created_at())).fromNow()

        const createdAtPretty = (): string => {
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate()-1)
            const createDate = new Date(created_at()) 

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

        return {
            index,
            contentLink, embeds, costs, constitution,
            author, content, title, layer, created_at, 
            vote, societyID, dataToSign, 
            createdAtAgo, createdAtPretty, pubKH,
            pubKHOrigin, endAt
        }
    }
}

export class ProposalCollection extends Collection {

    static FetchLastProposals = async (societyID: number, page: number) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}`, {
                headers: {
                    page,
                },
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return new ProposalCollection(res.data, {})
            }
        } catch (e: any){
            throw new Error(e.toString())
        }
    }

    constructor(initialState: any, options: any){
        super(initialState, [ProposalModel, ProposalCollection], options)
    }
}