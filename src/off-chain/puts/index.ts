import { Collection, Model } from 'acey'
import { ONCHAIN, Constant as Types, OFFCHAIN} from 'community-coin-types'
import {  Inv } from 'wallet-util';
import axios from 'axios'
import config from '../../config'
import { COIN_UNIT, /* CYCLE_IN_LUGH */ } from '../../constant';
import { LinkModel } from './link'
import { PubKHModel } from './pubkh'
import ValueModel from './value'
import { AliasModel } from '../alias'
import { SocietyModel } from '../society'

export interface IUnSerializedPut {
    time: number,
    kind: number,
    lh: number,
    tx_id: string,
    put_idx: number,
    link: ONCHAIN.ILink
    pubkh: ONCHAIN.IPubKH
    value: ONCHAIN.IValue,
    extra_data: string,
    alias: OFFCHAIN.IAuthor | null
}

const INITIAL_STATE: IUnSerializedPut = {
    time: 0,
    kind: 0,
    lh: 0,
    tx_id: "",
    put_idx: -1,
    pubkh: PubKHModel.DefaultState,
    link: LinkModel.DefaultState,
    value: ValueModel.DefaultState,
    extra_data: "",
    alias: null
}

export class UnserializedPutModel extends Model {

    static DefaultState: IUnSerializedPut = INITIAL_STATE

    constructor(state: IUnSerializedPut = INITIAL_STATE, options: any){
        super(state, options)
        this.setState({
            link: new LinkModel(state.link, this.kids()),
            pubkh: new PubKHModel(state.pubkh, this.kids()),
            value: new ValueModel(state.value, this.kids()),
            alias: state.alias ? new AliasModel(state.alias, this.kids()) : null
        })
    }

    isReward = () => this.isUpvote() || this.isReward0() || this.isReward1() || this.isReward2()

    isUpvote = () => this.get().extraData() === Types.UPVOTE_KEY
    isReward0 = () => this.get().extraData() === Types.REWARD0_KEY
    isReward1 = () => this.get().extraData() === Types.REWARD1_KEY
    isReward2 = () => this.get().extraData() === Types.REWARD2_KEY

    isAcceptedVote = () => this.get().extraData() === "accepted"
    isDeclinedVote = () => this.get().extraData() === "declined"

    isCostProposal = () => this.get().extraData() === "costs"
    isApplicationProposal = () => this.get().extraData() === "application"
    isConstitutionProposal = () => this.get().extraData() === "constitution"

    isProposal = () => this.isConstitutionProposal() || this.isCostProposal() || this.isApplicationProposal()

    isVote = () => this.isAcceptedVote() || this.isDeclinedVote()
    isThread = () => this.get().extraData() === "" && !!this.get().contentPKH()
    isRethread = () => this.get().extraData() === "" && !!this.get().contentPKH() && !!this.get().contentPKHTargeted()
    
    isRegularTx = () => this.get().extraData() == "" && !this.get().contentPKH() && !this.get().contentPKHTargeted()
    isLughTx = () => this.isRegularTx() && !this.get().pkh().get().sender()

    pretty = (pkh: Inv.PubKH) => {
        let action = ''
        let from = ''
        let to: string | number = ''
        const amount = `${this.get().pkh().get().sender()?.eq(pkh) ? '-' : '+'}${parseFloat(parseFloat(this.get().value().divDecimals(COIN_UNIT)).toFixed(2)).toLocaleString('en')}`

        if (this.isRegularTx()){
            if (this.isLughTx()){
                const lStr = this.get().height().toString()
                from = 'L'+'000000'.slice(0, 6 - lStr.length) + lStr
            } else {
                const amIFrom = this.get().pkh().get().sender()?.eq(pkh)

                const toAddr = (pkh: Inv.PubKH) => {
                    const addr = pkh.toAddress().get()
                    if (!this.get().otherPartyAlias())
                        return addr

                    const a = this.get().otherPartyAlias() as AliasModel
                    return a.get().username() || addr
                }

                from = amIFrom ? 'You' : toAddr(this.get().pkh().get().sender() as Inv.PubKH)
                to = !amIFrom ? 'you' : toAddr(this.get().pkh().get().recipient() as Inv.PubKH)
                action = 'sent to'
            }
        } else {
            if (this.isVote()){
                from = 'You'
                action = 'voted to'
                to = this.get().indexProposalTargeted()
            } else if (this.isThread()){
                from = ''
                action = 'New thread created : '
                to = this.get().contentPKH()?.hex() as string
            } else if (this.isRethread()){
                from = 'You'
                action = 'replied to'
                to = this.get().contentPKHTargeted()?.hex() as string
            } else if (this.isProposal()){
                action = `New ${this.get().extraData()} proposal`
                to = this.get().indexProposalTargeted()
            } else if (this.isReward()){
                from = 'You'
                action = this.isUpvote() ? 'upvoted' : 'rewarded'
                to = this.get().contentPKHTargeted()?.hex() as string
            } 
        }

        return {
            action,
            from,
            to,
            amount
        }
    }

    get = () => {

        const otherPartyAlias = (): AliasModel | null => this.state.alias

        const pkh = (): PubKHModel => this.state.pubkh
        const link = (): LinkModel => this.state.link

        const index = (): number => this.state.put_idx

        const contentPKH = () => {
            const from = link().get().from()
            if (typeof from === 'string'){
                return Inv.PubKH.fromHex(from)
            }
            return null
        }
        
        const contentPKHTargeted = () => {
            const to = link().get().to()
            if (typeof to === 'string'){
                return Inv.PubKH.fromHex(to)
            }
            return null
        }
        
        //Only usable method for proposal and vote puts.
        const indexProposalTargeted = (): number => {
            if (this.isProposal())
                return link().get().from() as number
            if (this.isVote())
                return link().get().to() as number
            return -1
        }
        
        return {
            pkh,
            link,
            index,
            value: () => (this.state.value as ValueModel).get().atCreationTime(),
            txID: (): Inv.TxHash => Inv.TxHash.fromHex(this.state.tx_id),
            createdAt: () => new Date(this.state.time / 1000),
            height: (): number => this.state.lh,
            contentPKH,
            contentPKHTargeted,
            indexProposalTargeted,
            otherPartyAlias,
            extraData: (): string => this.state.extra_data,
        }
    }

    setAuthor = (author: AliasModel) => {
        const a = this.get().otherPartyAlias()
        a && a.copyMetaData(author)
        return this.action()    
    }

}

export type T_FETCH_FILTER = 'all' | 'lugh' | 'non_lugh'

export class UnserializedPutCollection extends Collection {

    private _pageFetched: any = {}
    
    private _maxReached: any = {}

    private _currentSociety: SocietyModel | null = null

    constructor(list: IUnSerializedPut[] = [], options: any){
        super(list, [UnserializedPutModel, UnserializedPutCollection], options)
        this._initClassSettings()
    }

    private _initClassSettings = () => {
        this._pageFetched['all'] = 0
        this._pageFetched['lugh'] = 0
        this._pageFetched['non_lugh'] = 0

        this._maxReached['all'] = false
        this._maxReached['lugh'] = false
        this._maxReached['non_lugh'] = false
    }

    reset = () => {
        this._initClassSettings()
        return this.setState([])
    }

    setSociety = (s: SocietyModel) => {
        this._initClassSettings()
        this._currentSociety = s
    }

    filterLughsOnly = ()  => this.filter((p: UnserializedPutModel) => p.isLughTx()) as UnserializedPutCollection
    filterNonLughsOnly = () => this.filter((p: UnserializedPutModel) => !p.isLughTx()) as UnserializedPutCollection
    filterRewardsOnly = () => this.filter((p: UnserializedPutModel) => p.isReward()) as UnserializedPutCollection
    filterNonRewardsOnly = () => this.filter((p: UnserializedPutModel) => !p.isReward()) as UnserializedPutCollection


    get = () => {
        const inputs = (pkh: Inv.PubKH): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.get().pkh().get().sender()?.eq(pkh)) as UnserializedPutCollection
        const outputs = (pkh: Inv.PubKH): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.get().pkh().get().recipient()?.eq(pkh)) as UnserializedPutCollection
        return {
            inputs, outputs,
        }
    }

    private _assignJSONResponse = (list: IUnSerializedPut[]) => {
        for (const e of list){
            const { tx_id, time, kind, lh, pubkh, put_idx, value, extra_data, link } = e
            const o = {tx_id, time, kind, lh, pubkh, put_idx, value, extra_data, link }
            const idx = this.findIndex(o)
            idx == -1 ? this.push(e) : this.updateAt(e, idx)
        }
        this.save()
    }

    private _fetch = async (headerSignature: ONCHAIN.IHeaderSignature, filter: T_FETCH_FILTER, disablePageSystem: void | boolean) => {
        const MAX_PER_PAGE = 10

        if (this._maxReached[filter] == true && disablePageSystem != true){
            return 200
        }

        if (!this._currentSociety){
            throw new Error("You need to set the current used Society through the method 'setSociety' first.")
        }

        try { 
            const response = await axios(config.getRootAPIOffChainUrl() + '/puts/list/' + this._currentSociety.get().id(), {
                method: 'GET',
                headers: Object.assign({'content-type': 'application/json'}, headerSignature as any, {
                    offset: disablePageSystem == true ? 0 : this._pageFetched[filter] * MAX_PER_PAGE,
                    filter: {all: 0, lugh: 1, non_lugh: 2}[filter],
                }),
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (response.status == 200){
                const list = response.data || []
                if (disablePageSystem != true){
                    if (list.length < MAX_PER_PAGE){
                        this._maxReached[filter] = true
                    }
                    this._pageFetched[filter] += 1
                }
                this._assignJSONResponse(list)
            }
            return response.status
        } catch (e: any){
            throw new Error(e)
        }
    }

    fetch = (headerSignature: ONCHAIN.IHeaderSignature, disablePageSystem: void | boolean) => {
        return {
            all: () => this._fetch(headerSignature, 'all', disablePageSystem),
            lughPuts: () => this._fetch(headerSignature, 'lugh', disablePageSystem),
            nonLughPuts: () => this._fetch(headerSignature, 'non_lugh', disablePageSystem)
        }
    }

    sortByCreationDateDesc = () => this.orderBy('time', 'desc') as UnserializedPutCollection

    setAuthor = (author: AliasModel) => {
        this.forEach((t: UnserializedPutModel) => t.setAuthor(author))
        return this.action()
    }
}