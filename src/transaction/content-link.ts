import { Collection, Model } from 'acey'
import config from '../config';
import { IsUUID, UUIDToPubKeyHashHex } from 'wallet-util';
import { IOutput, IOutputRaw, Output } from './output';

import axios from 'axios'

export interface IVoteSummary {
    closed_at_lh: string
    approved: string
    declined: string
}

export interface IKindLink {
    tx_id: string
    lh: number
    vout: number
    output: IOutput
    target_content: string
}

export interface IKindLinkRaw {
    tx_id: Buffer
    lh: number
    vout: number
    output: IOutputRaw
    target_content: Buffer
}

export interface IContentLink { 
    vote: IVoteSummary
    index: number
    link: IKindLink
    pubkh_origin: string
}

export interface IContentLinkRaw { 
    link: IKindLinkRaw
    pubkh_origin: Buffer
}

export class ContentLink extends Model {

    static FetchThread = async (hashOrUUID: string) => {
        let hash = hashOrUUID
        if (IsUUID(hashOrUUID)){
            hash = UUIDToPubKeyHashHex(hashOrUUID)
        }

        const response = await axios(config.getRootAPIChainUrl() + '/thread/' + hash, {
            timeout: 10000
        })
        if (response.status === 200){
            const json = response.data
            return new ContentLink(json, {})
        }
        throw new Error(response.data)
    }

    static FetchProposal = async (hashOrUUID: string) => {
        let hash = hashOrUUID
        if (IsUUID(hashOrUUID)){
            hash = UUIDToPubKeyHashHex(hashOrUUID)
        }

        const response = await axios(config.getRootAPIChainUrl() + '/proposal/' + hash, {
            timeout: 10000,
        })
        if (response.status === 200){
            const json = response.data
            return new ContentLink(json, {})
        }
        throw new Error(response.data)
    }

    constructor(initialState: IContentLink, options: any){
        super(initialState, options)
        this.setState({
            link: Object.assign(initialState.link, {
                output: new Output(initialState.link.output, this.kids())
            })
        })
    }
    
    is2 = () => {
        return {
            proposal: () => this.get().index() >= 0,
            thread: () => this.get().index() == -1
        }
    }

    get = () => {
        return {
            txID: (): string => this.state.link.tx_id,
            vout: (): number => this.state.link.vout,
            lh: (): number => this.state.link.lh,
            output: (): Output => this.state.link.output,
            targetContent: (): string => this.state.link.target_content,
            pubKHAuthor: (): string => this.state.pubkh_origin,
            index: (): number => this.state.index,
            vote: (): IVoteSummary => this.state.vote
        }
    }

    toRaw = (): IContentLinkRaw => {
        return {
            link: {
                tx_id: Buffer.from(this.get().txID(), 'hex'),
                vout: this.get().vout(),
                lh: this.get().lh(),
                output: this.get().output().toRaw().default(),
                target_content: Buffer.from(this.get().targetContent(), 'hex')
            },
            pubkh_origin: Buffer.from(this.get().pubKHAuthor(), 'hex')
        }
    }
}

export class ContentLinkList extends Collection {
    constructor(initialState = [], options: any){
        super(initialState, [ContentLink, ContentLinkList], options)
    }
}