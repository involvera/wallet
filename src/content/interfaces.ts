import { IContentLink } from "../transaction";

export interface IAuthor {
    address: string
    pp: string
    username: string
}

export type TLayer = 'Economy' | 'Application' | 'Constitution'

export interface IVote {
    approved: number
    declined: number
    closed_at: Date
}

export interface IProposal {
    sid: number
    link: IContentLink
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
    link: IContentLink
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