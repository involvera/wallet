import axios from 'axios'
import * as bip32 from 'bip32'
import { Collection, Model } from "acey";
import { BuildSignatureHex } from 'wallet-util'

import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IProposal, TLayer } from "./interfaces";
import config from "../config";
import {VoteModel, IVote } from './vote'

export class Proposal extends Model {

    static NewContent = (sid: number, title: string, content: string[]): Proposal => {
        if (content.length != 3){
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
        const created_at = (): Date => this.state.created_at 
        const vote = (): IVote | null => this.state.vote
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
            vote, societyID, dataToSign
        }
    }
}

export class ProposalList extends Collection {
    constructor(initialState: any, options: any){
        super(initialState, [Proposal, ProposalList], options)
    }
}