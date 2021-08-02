import moment from 'moment'
import axios from 'axios'
import * as bip32 from 'bip32'
import { Collection, Model } from "acey";
import { BuildSignatureHex } from 'wallet-util'

import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IProposal, TLayer } from "./interfaces";
import config from "../config";
import {VoteModel, IVote } from './vote'
import { T_FETCHING_FILTER } from '../constant/off-chain';

export class Proposal extends Model {

    static NewContent = (sid: number, title: string, content: string[]): Proposal => {
        if (content.length < 3 || content.length > 4){
            throw new Error("Wrong proposal contents length")
        }
        return new Proposal({sid, content, title} as any, {})
    }

    constructor(state: IProposal, options: any){
        super(state, options) 
        !!state.content_link && this.setState({ content_link: new ContentLink(state.content_link, this.kids()) })
        !!state.vote && this.setState({ vote: new VoteModel(state.vote, this.kids()) })        
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
                res.status == 201 && this.setState(res.data)
                return res
            } catch (e){
                return e.toString()
            }
    }

    is2 = () => {
        const pending = (): boolean => !!this.get().end_at() 
        const approved = (): boolean => pending() && this.get().approved() > 50
        return {
            pending, approved
        }
    }

    get = () => {
        const contentLink = (): ContentLink | null => this.state.content_link
        const societyID = (): number => this.state.sid
        const embedData = (): IEmbedData => this.state.embed_data
        const costs = () => { 
            const link = contentLink()
            if (link == null)
                throw new Error("content_link is null")
            return link.get().output().get().script().parse().proposalCosts()
        }
        const constitution = () => {
            const link = contentLink()
            if (link == null)
                throw new Error("content_link is null")
            return link.get().output().get().script().parse().constitution()
        }
        const author = (): IAuthor => this.state.author
        const content = (): string[] => this.state.content 
        const title = (): string => this.state.title
        const created_at = (): number => (this.state.created_at as Date).getTime()
        const end_at = (): number => !this.state.end_at ? -1 : (this.state.end_at as Date).getTime()

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
        
        const vote = (): IVote | null => this.state.vote
        
        const approved = (): number => {
            const v = vote()
            if (!v)
                return -1
            return v.approved
        }

        const declined = (): number => {
            const v = vote()
            if (!v)
                return -1
            return v.declined
        }
        
        const dataToSign = (): string => this.get().content().join('~~~_~~~_~~~_~~~')

        const layer = (): TLayer => {
            const link = contentLink()
            if (link == null)
                throw new Error("content_link is null")
            const is = link.get().output().get().script().is()
            if (is.costProposalScript())
                return 'Economy'
            if (is.constitutionProposalScript())
                return 'Constitution'
            return 'Application'
        }

        return {
            contentLink, embedData, costs, constitution,
            author, content, title, layer, created_at, 
            vote, societyID, dataToSign, end_at, 
            createdAtAgo, createdAtPretty,
            approved, declined
        }
    }
}

export class ProposalList extends Collection {

    constructor(initialState: any, options: any){
        super(initialState, [Proposal, ProposalList], options)
    }

    pullProposalByIndex = async (societyID: number, index: number) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}/${index}`,  {
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const { data } = res
                const idx = this.findIndex({sid: societyID, index: data.index})
                idx < 0 ? this.push(data) : this.updateAt(this.newNode(data), idx)
                this.save().store()
            }
        } catch (e){
            return e.toString()
        }
    }


    pullLastProposals = async (societyID: number, page: number) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/proposal/${societyID}`,  {
                headers: {
                    page: page,
                },
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const { data } = res
                for (let i = 0; i < data.length; i++){
                    if (!this.find({sid: societyID, public_key_hashed: data[i].public_key_hashed})){
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