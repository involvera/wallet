import { IContentLink } from "../transaction";
import { IVote } from "./vote";

export interface IAuthor {
    public_key_hashed: string
    pp: string
    username: string
}
export type TLayer = 'Economy' | 'Application' | 'Constitution'

export interface IProposal {
    sid: number
    content_link: IContentLink
    vote: IVote
    index: number
    created_at: Date
    title: string,
    content: string[3],
    author: IAuthor,
    embed_data: IEmbedData,
}

export interface IThread {
    sid: number
    content_link: IContentLink
    author: IAuthor,
    title: string,
    content: string,
    embed_data: IEmbedData,
    created_at: Date
}

export interface IReactionCount {
    upvote: number
    0: number
    1: number
    2: number
}

export interface IEmbedData{
    proposals: IProposal[],
    threads: IThread[],
    reaction_counter?: IReactionCount 
}

export interface ISociety {
    id: number
    name: string
    created_at: Date
    currency_symbol: string
    description: string
    domain: string,
    currency_route_api: string
}

export interface IScriptOrigin {
    tx_id: string | null
    vout: number
}

export interface IScriptProposal {
    origin: IScriptOrigin
    pubkh: string
    content_nonce: number
}