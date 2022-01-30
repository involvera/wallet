import axios from 'axios'
import { IKindLinkUnRaw, IRewardSummary, IVoteSummary} from 'community-coin-types'
import { Collection, Model } from 'acey'
import config from '../config';
import { IsUUID, UUIDToPubKeyHashHex } from 'wallet-util';
import { KindLinkModel } from './kind-link'
import { VoteModel } from '../off-chain/proposal/vote'
import { RewardSummaryModel } from './reward-summary'

export interface IContentLink { 
    vote: IVoteSummary | null
    index: number
    link: IKindLinkUnRaw
    pubkh_origin: string
    rewards: IRewardSummary | null
}

export const DEFAULT_STATE: IContentLink = {
    vote: VoteModel.DefaultState,
    index: 0,
    link: KindLinkModel.DefaultState,
    pubkh_origin: '',
    rewards: RewardSummaryModel.DefaultState
}

export class ContentLinkModel extends Model {

    static DefaultState: IContentLink = DEFAULT_STATE
    
    static FetchThread = async (hashOrUUID: string) => {
        let hash = hashOrUUID
        if (IsUUID(hashOrUUID)){
            hash = UUIDToPubKeyHashHex(hashOrUUID)
        }

        const response = await axios(config.getRootAPIChainUrl() + '/thread/' + hash, {
            timeout: 10000,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            },
        })
        if (response.status === 200){
            const json = response.data
            return new ContentLinkModel(json, {})
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
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            },
        })
        if (response.status === 200){
            const json = response.data
            return new ContentLinkModel(json, {})
        }
        throw new Error(response.data)
    }

    constructor(initialState: IContentLink = DEFAULT_STATE, options: any){
        super(initialState, options)
        this.setState({            
            link: new KindLinkModel(initialState.link, this.kids()),
            vote: new VoteModel(initialState.vote != null ? initialState.vote : undefined , this.kids()),
            rewards: new RewardSummaryModel(initialState.rewards != null ? initialState.rewards : undefined, this.kids())
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
            link: (): KindLinkModel => this.state.link,
            pubKHAuthor: (): string => this.state.pubkh_origin,
            index: (): number => this.state.index,
            vote: (): VoteModel => this.state.vote,
            rewards: (): RewardSummaryModel => this.state.rewards
        }
    }
}

export class ContentLinkCollection extends Collection {
    constructor(initialState = [], options: any){
        super(initialState, [ContentLinkModel, ContentLinkCollection], options)
    }
}