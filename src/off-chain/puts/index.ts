import { Collection, Model } from 'acey'
import { Buffer } from 'buffer'
import { IPubKH, ILink, IValue } from 'community-coin-types'
import { COIN_UNIT, /* CYCLE_IN_LUGH */ } from '../../constant';
import { /* CalculateOutputMeltedValue,*/ GetAddressFromPubKeyHash } from 'wallet-util';
import axios from 'axios'
import config from '../../config'
import { IHeaderSignature } from '../../wallet/wallet';

import { LinkModel } from './link'
import { PubKHModel } from './pubkh'
import ValueModel from './value'
import { SocietyModel } from '../';
import { AliasModel, IAlias } from '../alias';

export interface IUnSerializedPut {
    time: number,
    kind: number,
    lh: number,
    tx_id: string,
    put_idx: number,
    pubkh: IPubKH
    link: ILink
    value: IValue,
    extra_data: string,
    alias: IAlias | null
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
            alias: state.alias ? new AliasModel(undefined, this.kids()) : null
        })
    }

    isReaction = () => this.isUpvote() || this.isReaction0() || this.isReaction1() || this.isReaction2()

    isUpvote = () => this.get().extraData() === "upvote"
    isReaction0 = () => this.get().extraData() === "reaction_0"
    isReaction1 = () => this.get().extraData() === "reaction_1"
    isReaction2 = () => this.get().extraData() === "reaction_2"

    isAcceptedVote = () => this.get().extraData() === "accepted"
    isDeclinedVote = () => this.get().extraData() === "declined"

    isCostProposal = () => this.get().extraData() === "costs"
    isApplicationProposal = () => this.get().extraData() === "application"
    isConstitutionProposal = () => this.get().extraData() === "constitution"

    isProposal = () => this.isConstitutionProposal() || this.isCostProposal() || this.isApplicationProposal()

    isVote = () => this.isAcceptedVote() || this.isDeclinedVote()
    isThread = () => this.get().extraData() === "" && this.get().contentPKH() != ""
    isRethread = () => this.get().extraData() === "" && this.get().contentPKH() != "" && this.get().contentPKHTargeted() != ""
    
    isRegularTx = () => this.get().extraData() == "" && this.get().contentPKH() == "" && this.get().contentPKHTargeted() == ""
    isLughTx = () => this.isRegularTx() && this.get().pkh().get().sender() == ""

    pretty = (pkh: string) => {
        let action = ''
        let from = ''
        let to: string | number = ''
        const amount = `${this.get().pkh().get().sender() == pkh ? '-' : '+'}${parseFloat((Number(this.get().value()) / COIN_UNIT).toFixed(2)).toLocaleString('en')}`

        if (this.isRegularTx()){
            if (this.isLughTx()){
                const lStr = this.get().height().toString()
                from = 'L'+'000000'.slice(0, 6 - lStr.length) + lStr
            } else {
                const amIFrom = this.get().pkh().get().sender() === pkh

                const toAddr = (hexPKH: string) => {
                    const addr = GetAddressFromPubKeyHash(Buffer.from(hexPKH, 'hex'))
                    if (!this.get().otherPartyAlias())
                        return addr

                    const a = this.get().otherPartyAlias() as AliasModel
                    return a.get().username() || addr
                }

                from = amIFrom ? 'You' : toAddr(this.get().pkh().get().sender())
                to = !amIFrom ? 'you' : toAddr(this.get().pkh().get().recipient())
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
                to = this.get().contentPKH()
            } else if (this.isRethread()){
                from = 'You'
                action = 'replied to'
                to = this.get().contentPKHTargeted()
            } else if (this.isProposal()){
                action = `New ${this.get().extraData()} proposal`
                to = this.get().indexProposalTargeted()
            } else if (this.isReaction()){
                from = 'You'
                action = this.isUpvote() ? 'upvoted' : 'rewarded'
                to = this.get().contentPKHTargeted()
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
        const value = (): ValueModel => this.state.value

        const index = (): number => this.state.put_idx

        const CCH = (): string => this.state.fetched_at_cch
        const MR = () => Number(value().get().now() / value().get().atCreationTime() )

        /*
        const meltedValueRatio = (CCHList: string[]) => {
            let count = 0
            for (const cch of CCHList){
                if (cch === CCH())
                    break
                count++
            }
            if (count == CCHList.length) 
                return 0
            
            const r = MR() - ((1 / CYCLE_IN_LUGH) * count)
            if (r > 1 || r < 0) 
                return 0
    
            return r
        }
        */

        const contentPKH = (): string => link().get().from()
        
        const contentPKHTargeted = (): string => {
            if (!this.isProposal() && !this.isVote())
                return link().get().to()
            return ""
        }
        
        const indexProposalTargeted = (): number => {
            if (this.isProposal())
                return parseInt(link().get().from())
            if (this.isVote())
                return parseInt(link().get().to())
            return -1
        }
        
        // const currentValue = (CCHList: string[]) => CalculateOutputMeltedValue(BigInt(value().get().atCreationTime()), meltedValueRatio(CCHList))
     
        return {
            pkh,
            link,
            index,
            value: (): number => (this.state.value as ValueModel).get().atCreationTime(),
            txID: (): string => this.state.tx_id,
            createdAt: () => new Date(this.state.time),
            height: (): number => this.state.lh,
            contentPKH,
            contentPKHTargeted,
            indexProposalTargeted,
            otherPartyAlias,
            extraData: (): string => this.state.extra_data,
            // currentValue,
        }
    }
}

export class UnserializedPutCollection extends Collection {

    private _pageFetched = {
        all: 0,
        lugh: 0,
        non_lugh: 0
    }
    
    private _maxReached = {
        all: false,
        lugh: false,
        non_lugh: false
    }

    private _currentSociety: SocietyModel | null = null

    constructor(list: IUnSerializedPut[] = [], options: any){
        super(list, [UnserializedPutModel, UnserializedPutCollection], options)
    }

    setSociety = (s: SocietyModel) => this._currentSociety = s

    filterLughOnly = ()  => this.filter((p: UnserializedPutModel) => p.isLughTx()) as UnserializedPutCollection
    filterNonLughOnly = () => this.filter((p: UnserializedPutModel) => !p.isLughTx()) as UnserializedPutCollection
    filterReactionOnly = () => this.filter((p: UnserializedPutModel) => p.isReaction()) as UnserializedPutCollection
    filterNonReaction = () => this.filter((p: UnserializedPutModel) => !p.isReaction()) as UnserializedPutCollection


    get = () => {
        const inputs = (pkhHex: string): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.get().pkh().get().sender() == pkhHex) as UnserializedPutCollection
        const outputs = (pkhHex: string): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.get().pkh().get().recipient() == pkhHex) as UnserializedPutCollection
        return {
            inputs, outputs,
        }
    }

    private _assignJSONResponse = (list: IUnSerializedPut[]) => {
        for (const e of list){
            const { tx_id, time, kind, lh, pubkh, put_idx, value, extra_data, link } = e
            const o = {tx_id, time, kind, lh, pubkh, put_idx, value, extra_data, link }
            !this.find(o) && this.push(e)
        }
        this.save()
    }

    private _fetch = async (headerSignature: IHeaderSignature, filter: 'all' | 'lugh' | 'non_lugh', disablePageSystem: void | boolean) => {
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
                headers: Object.assign({}, headerSignature as any, {
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

    fetch = (headerSignature: IHeaderSignature, disablePageSystem: void | boolean) => {
        return {
            all: () => this._fetch(headerSignature, 'all', disablePageSystem),
            lughPuts: () => this._fetch(headerSignature, 'lugh', disablePageSystem),
            nonLughPuts: () => this._fetch(headerSignature, 'non_lugh', disablePageSystem)
        }
    }

    sortByCreationDateDesc = () => this.orderBy('time', 'desc') as UnserializedPutCollection
}