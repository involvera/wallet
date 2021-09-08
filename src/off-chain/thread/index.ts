import axios from 'axios'
import * as bip32 from 'bip32'
import { Model, Collection } from "acey";
import { BuildSignatureHex } from 'wallet-util'
import { IKindLink, KindLinkModel, DEFAULT_STATE_KIND } from "../../transaction";
import config from '../../config'
import { AliasModel, IAlias, DEFAULT_STATE as DEFAULT_ALIAS_STATE } from '../alias';
import { IRewards, RewardsModel, DEFAULT_STATE as DEFAULT_STATE_REWARDS} from './rewards'

export interface IThread {
    sid: number
    content_link?: IKindLink
    author?: IAlias
    title: string
    content: string
    public_key_hashed: string
    rewards?: IRewards
    embeds?: string[]
    created_at?: Date
}

export const DEFAULT_STATE: IThread = {
    sid: 0,
    content_link: DEFAULT_STATE_KIND,
    author: DEFAULT_ALIAS_STATE,
    title: '',
    content: '',
    public_key_hashed: "",
    rewards: DEFAULT_STATE_REWARDS,
    embeds: [],
    created_at: new Date()
}

export class ThreadModel extends Model {

    static FetchByPKH = async (societyID: number, pubkh: string) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/thread/${societyID}/${pubkh}`,  {
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const { data } = res
                return new ThreadModel(data, {})
            }
        } catch (e){
            throw new Error(e.toString())
        }
        return null
    }

    static NewContent = (sid: number, title: string, content: string): ThreadModel => {
        return new ThreadModel({sid, content, title} as any, {})
    }

    constructor(state: IThread = DEFAULT_STATE, options: any){
        super(state, options) 
        this.setState(Object.assign(state, { 
            content_link: new KindLinkModel(state.content_link, this.kids()),
            author: new AliasModel(state.author, this.kids()),
            rewards: new RewardsModel(state.rewards, this.kids())
        }))
    }

    sign = (wallet: bip32.BIP32Interface) => {
        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().content()))
        this.setState({
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        })
    }
    
    broadcast = async (wallet: bip32.BIP32Interface) => {
        try {
            this.sign(wallet)
            const json = this.to().plain()
            !json.title && delete json.title
            const res = await axios(config.getRootAPIOffChainUrl() + '/thread', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                data: json,
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            res.status == 201 && this.hydrate(Object.assign({}, res.data, {
                content_link: JSON.parse(res.data.content_link)               
            }))
            return res
        } catch (e){
            throw new Error(e)
        }
    }

    get = () => {
        const societyID = (): number => this.state.sid
        const contentLink = (): KindLinkModel => this.state.content_link
        const embeds = (): string[] => this.state.embeds
        const author = (): AliasModel => this.state.author
        const title = (): string => this.state.title
        const content = (): string => this.state.content
        const createdAt = (): Date => this.state.created_at
        const pubKH = (): string => this.state.public_key_hashed
        const rewards = (): RewardsModel => this.state.rewards

        return {
            contentLink, embeds, author, title,
            content, createdAt, societyID,
            pubKH, rewards
        }
    }
}

export class ThreadCollection extends Collection {

    static FetchLastThreads = async (societyID: number, page: number) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/thread/${societyID}`,  {
                headers: {
                    page: page
                },
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return new ThreadCollection(res.data, {})
            }
        } catch (e){
            throw new Error(e)
        }
        return null
    }

    constructor(initialState: any, options: any){
        super(initialState, [ThreadModel, ThreadCollection], options)
    }
}