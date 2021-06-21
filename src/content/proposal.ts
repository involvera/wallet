import { Collection, Model } from "acey";
import { ContentLink } from "../transaction";
import { IAuthor, IEmbedData, IProposal, TLayer } from "./interfaces";
import axios from 'axios'
import config from "../config";
import {VoteModel, IVote } from './vote'
import * as bip32 from 'bip32'

import { ec as EC } from 'elliptic'
const ec = new EC('secp256k1');

export class Proposal extends Model {

    static NewContent = (sid: number, title: string, content: string[3]): Proposal => {
        return new Proposal({sid, content, title} as any, {})
    }

    constructor(state: IProposal, options: any){
        super(state, options) 
        this.setState({
            link: new ContentLink(state.content_link, this.kids()),
            vote: new VoteModel(state.vote, this.kids())
        })
    }


    sign = (wallet: bip32.BIP32Interface) => {
        const priv = wallet.privateKey as Buffer
        const pub = wallet.publicKey
        const sig = Buffer.from(ec.sign(this.get().dataToSign(), priv).toDER()).toString('hex')
        this.setState({
            public_key: pub,
            signature: sig
        })
    }

    broadcast = async () => {
        try {
            const json = this.to().plain()
            json.content = this.get().dataToSign()

            const res = await axios(config.getRootAPIContentUrl() + '/proposal/', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                data: json,
                timeout: 10_000
            })
            if (res.status == 201){
                const json = await res.data()
                this.setState(json)
            }
            return res
        } catch (e){
            throw new Error(e)
        }
    }

    get = () => {
        const contentLink = (): ContentLink => this.state.link
        const societyID = (): number => this.state.sid
        const id = () => contentLink().get().output().get().contentUUID()
        const embedData = (): IEmbedData => this.state.embed_data
        const costs = () => contentLink().get().output().get().script().parse().proposalCosts()
        const constitution = () => contentLink().get().output().get().script().parse().constitution()
        const author = (): IAuthor => this.state.author
        const content = (): string[] => this.state.content 
        const title = (): string => this.state.title
        const created_at = (): Date => this.state.created_at 
        const vote = (): IVote => this.state.vote
        const dataToSign = (): string => this.get().content().join('~~~_~~~_~~~_~~~')

        const layer = (): TLayer => {
            const is = contentLink().get().output().get().script().is()
            if (is.costProposalScript())
                return 'Economy'
            if (is.constitutionProposalScript())
                return 'Constitution'
            return 'Application'
        }

        return {
            contentLink, id, embedData, costs, constitution,
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