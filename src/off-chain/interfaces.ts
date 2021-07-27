import { IContentLink } from "../transaction";
import { IVote } from "./vote";
import { Constitution as C } from 'wallet-script'
import { ICost  } from '../wallet/costs'

export interface IAuthor {
    public_key_hashed: string
    pp: string
    username: string
}
export type TLayer = 'Economy' | 'Application' | 'Constitution'

export interface IContributorStats { 
    addr: string
    position: number
    sid: number
}

export interface IProposal {
    sid: number
    content_link: IContentLink
    vote: IVote
    index: number
    created_at: Date
    title: string,
    content: string[3]
    author: IAuthor
    embed_data: IEmbedData
}

export interface IThread {
    sid: number
    content_link: IContentLink
    author: IAuthor
    title: string
    content: string
    embed_data: IEmbedData
    created_at: Date
}

export interface IReactionCount {
    upvote: number
    0: number
    1: number
    2: number
}

export interface IEmbedData{
    proposals: IProposal[]
    threads: IThread[]
    reaction_counter?: IReactionCount 
}

export interface IConstitutionData {
    proposal: IScriptProposal
    constitution: C.TConstitution
}

export interface ISocietyStats {
    last_height: number
    total_contributor: number
    active_addresses: number
    most_active_addresses: IAuthor[]
    circulating_supply: string
    circulating_vp_supply: string
}

export interface ISociety {
    id: number
    name: string
    created_at: Date
    currency_symbol: string
    description: string
    domain: string,
    currency_route_api: string
    stats: ISocietyStats
    costs: ICost
    constitution: IConstitutionData
    contributor: IContributorStats
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