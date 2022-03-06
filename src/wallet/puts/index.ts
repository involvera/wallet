import { Collection, Model } from 'acey'
import { Buffer } from 'buffer'
import { ILink, IPubKH, IValue  } from 'community-coin-types'
import { COIN_UNIT, CYCLE_IN_LUGH } from '../../constant';
import { TByte } from 'wallet-script'
import { CalculateOutputMeltedValue, GetAddressFromPubKeyHash } from 'wallet-util';
import axios from 'axios'
import config from '../../config'
import { IHeaderSignature } from '../wallet';

import { LinkModel } from './link'
import { PubKHModel } from './pubkh'
import ValueModel from './value'

export interface IUnserializedPut {
    time: number
    kind: TByte
    lh: number
    tx_id: string
    link: ILink
    put_index: number
    pubkh: IPubKH
    value: IValue
    extra_data: string
    fetched_at_cch: string   
}

const INITIAL_STATE: IUnserializedPut = {
    time: 0,
    kind: 0,
    lh: 0,
    tx_id: "",
    put_index: -1,
    pubkh: PubKHModel.DefaultState,
    link: LinkModel.DefaultState,
    value: ValueModel.DefaultState,
    extra_data: "",
    fetched_at_cch: "",
}

export class UnserializedPutModel extends Model {

    static DefaultState: IUnserializedPut = INITIAL_STATE

    constructor(state: IUnserializedPut = INITIAL_STATE, options: any){
        super(state, options)
        this.setState({
            link: new LinkModel(state.link, this.kids()),
            pubkh: new PubKHModel(state.pubkh, this.kids()),
            value: new ValueModel(state.value, this.kids()),
        })
    }

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
        const amount = `${this.get().pkh().get().sender() == pkh ? '-' : '+'}${parseFloat((Number(this.get().value().get().atCreationTime()) / COIN_UNIT).toFixed(2)).toLocaleString('en')}`

        if (this.isRegularTx()){
            if (this.isLughTx()){
                const lStr = this.get().height().toString()
                from = 'L'+'000000'.slice(0, 6 - lStr.length) + lStr
            } else {
                from = this.get().pkh().get().sender() === pkh ? 'You' : GetAddressFromPubKeyHash(Buffer.from(this.get().pkh().get().sender(), 'hex'))
                to = this.get().pkh().get().recipient() === pkh ? 'you' : GetAddressFromPubKeyHash(Buffer.from(this.get().pkh().get().recipient(), 'hex'))
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

        const pkh = (): PubKHModel => this.state.pubkh
        const link = (): LinkModel => this.state.link
        const value = (): ValueModel => this.state.value

        const CCH = (): string => this.state.fetched_at_cch
        const MR = () => Number(value().get().now() / value().get().atCreationTime() )

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
 
        const currentValue = (CCHList: string[]) => CalculateOutputMeltedValue(BigInt(value().get().atCreationTime()), meltedValueRatio(CCHList))
     
        return {
            pkh,
            link,
            value,
            txID: (): string => this.state.tx_id,
            createdAt: () => new Date(this.state.time),
            height: (): number => this.state.lh,
            contentPKH,
            contentPKHTargeted,
            indexProposalTargeted,
            extraData: (): string => this.state.extra_data,
            currentValue,
        }
    }
}

export class UnserializedPutCollection extends Collection {

    constructor(list: IUnserializedPut[] = [], options: any){
        super(list, [UnserializedPutModel, UnserializedPutCollection], options)
    }

    sortByTime = () => this.orderBy('time', 'desc') as UnserializedPutCollection

    get = () => {
        const inputs = (pkhHex: string): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.get().pkh().get().sender() == pkhHex) as UnserializedPutCollection
        const outputs = (pkhHex: string): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.get().pkh().get().recipient() == pkhHex) as UnserializedPutCollection
        const betweenDates = (from: Date, to: Date) => this.filter((p: UnserializedPutModel) => from <= p.get().createdAt() && to >= p.get().createdAt()) as UnserializedPutCollection
       
        const votePowerDistribution = (): UnserializedPutCollection => this.filter((p: UnserializedPutModel) => p.isLughTx()) as UnserializedPutCollection

        const atDay = (dayDate: Date): UnserializedPutCollection => {
            const from = new Date(dayDate)
            const to = new Date(dayDate)

            from.setSeconds(0)
            from.setMilliseconds(0)
            from.setMinutes(0)
            from.setHours(0)

            to.setMilliseconds(999)
            to.setSeconds(59)
            to.setMinutes(59)
            to.setHours(23)

            return betweenDates(from, to)
        }

        const activity = () => {

            const atDayActivity = (d: Date) => {
                let total = BigInt(0)
                atDay(d).forEach((p: UnserializedPutModel) => {
                    if (p.isVote() || p.isThread() || p.isRethread() || p.isProposal()){
                        total = BigInt(total as any) + BigInt(p.get().value().get().atCreationTime() as any)
                    }
                })
                return total
            }

            const onLastNDays = (n: Number) => {
                if (n > (CYCLE_IN_LUGH-1) / 3)
                    n = (CYCLE_IN_LUGH-1) / 3
                
                let i = 0;
                const ret: BigInt[] = []
                while (i <= n){
                    const d = new Date()
                    d.setTime(d.getTime() - ((24 * 3_600 * 1_000) * i))
                    const score = atDayActivity(d)
                    ret.push(score)
                    i++
                }
                return ret
            }

            return {
                onLastNDays, 
                atDayActivity
            }
        }

        return {
            inputs, outputs,
            betweenDates,
            atDay,
            activity, 
            votePowerDistribution
        }
    }

    assignJSONResponse = (json: any) => {
        json.list = json.list || []
        let countAdded = 0 
        const copy = new UnserializedPutCollection(this.to().plain(), {})
        copy.forEach((u: UnserializedPutModel) => {
            u.get().value().setState({ now: null })
            u.setState({ fetched_at_cch: null })
        })
        for (const put of json.list){
            if (copy.indexOf(Object.assign({}, put, {fetched_at_cch: null, value: { at_time: put.value.at_time, now: null } })) == -1) {
                this.push(Object.assign({}, put, { fetched_at_cch: json.fetched_at_cch }))
                countAdded++
            }
        }
        countAdded > 0 && this.action().store()
    }

    fetch = () => {
        const fromTX = async (txHashHex: string, headerSignature: IHeaderSignature) => {
            try { 
                const response = await axios(config.getRootAPIChainUrl() + '/puts/' + txHashHex, {
                    headers: headerSignature as any,
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                if (response.status == 200){
                    const json = response.data
                    this.assignJSONResponse(json)
                }
                return response.status
            } catch (e: any){
                throw new Error(e)
            }
        }

        const all = async (lastHeight: number, headerSignature: IHeaderSignature) => {
            try { 
                const response = await axios(config.getRootAPIChainUrl() + '/puts/list', {
                    method: 'GET',
                    headers: Object.assign({}, headerSignature as any, {last_lh: lastHeight }),
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                if (response.status == 200){
                    const json = response.data
                    this.assignJSONResponse(json)
                }
                return response.status
            } catch (e: any){
                throw new Error(e)
            }
        }

        return { fromTX, all }
    }

    sortByCreationDate = () => this.orderBy('time', 'desc') as UnserializedPutCollection
    
}