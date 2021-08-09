import { Collection, Model } from 'acey'
import { COIN_UNIT, CYCLE_IN_LUGH, LUGH_AMOUNT } from '../constant';
import { TByte } from 'wallet-script'
import { CalculateOutputMeltedValue, GetAddressFromPubKeyHash, PubKeyHashHexToUUID } from 'wallet-util';
import axios from 'axios'
import config from '../config'
import { IHeaderSignature } from './wallet';

export interface ILink {
    from: string
    to: string
}

export interface IPubKH {
    sender: string
    recipient: string
}

export interface IValue {
    at_time: number
    now: number
}

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
    pubkh: {sender: "", recipient: ""},
    link: {from: "", to: ""},
    value: {at_time: 0, now: 0},
    extra_data: "",
    fetched_at_cch: "",
}

export class UnserializedPut extends Model {

    constructor(initialState = INITIAL_STATE, options: any){
        super(initialState, options)
    }

    isAcceptedVote = () => this.get().extraData() === "accepted"
    isDeclinedVote = () => this.get().extraData() === "declined"

    isCostProposal = () => this.get().extraData() === "costs"
    isApplicationProposal = () => this.get().extraData() === "application"
    isConstitutionProposal = () => this.get().extraData() === "constitution"
 
    isUpvote = () => this.get().extraData() === "upvote"
    isReaction0 = () => this.get().extraData() === "reaction_0"
    isReaction1 = () => this.get().extraData() === "reaction_1"
    isReaction2 = () => this.get().extraData() === "reaction_2"
    
    isReward = () => this.isUpvote() || this.isReaction0() || this.isReaction1() || this.isReaction2()
    isProposal = () => this.isConstitutionProposal() || this.isCostProposal() || this.isApplicationProposal()
    isVote = () => this.isAcceptedVote() || this.isDeclinedVote()
    isThread = () => this.get().extraData() === "" && this.get().contentPKH() != ""
    isRethread = () => this.get().extraData() === "" && this.get().contentPKH() != "" && this.get().contentPKHTargeted() != ""
    
    isRegularTx = () => this.get().extraData() == "" && this.get().contentPKH() == "" && this.get().contentPKHTargeted() == ""
    isLughTx = () => this.isRegularTx() && this.get().senderPKH() == ""

    pretty = (pkh: string) => {
        let action = ''
        let from = ''
        let to = ''
        const amount = `${this.get().senderPKH() == pkh ? '-' : '+'}${parseFloat((Number(this.get().valueAtCreationTime()) / COIN_UNIT).toFixed(2)).toLocaleString('en')}`

        if (this.isRegularTx()){
            if (this.isLughTx()){
                from = 'Involvera : Lugh'
            } else {
                from = this.get().senderPKH() === pkh ? 'You' : GetAddressFromPubKeyHash(Buffer.from(this.get().senderPKH(), 'hex'))
                to = this.get().recipientPKH() === pkh ? 'you' : GetAddressFromPubKeyHash(Buffer.from(this.get().recipientPKH(), 'hex'))
                action = 'sent to'
            }
        } else {
            if (this.isVote()){
                from = 'You'
                action = 'voted to'
                to = GetAddressFromPubKeyHash(Buffer.from(this.get().contentPKHTargeted(), 'hex'))
            } else if (this.isThread()){
                from = ''
                action = 'New thread created : '
                to = GetAddressFromPubKeyHash(Buffer.from(this.get().contentPKH(), 'hex'))
            } else if (this.isRethread()){
                from = 'You'
                action = 'replied to'
                to = GetAddressFromPubKeyHash(Buffer.from(this.get().contentPKHTargeted(), 'hex'))
            } else if (this.isReward()){
                const emoji: any = {upvote: '👍', reaction_0: '⭐', reaction_1: '💫', reaction_2: '✨'}
                action = `${this.get().extraData() === 'upvote' ? 'upvoted' : `reacted ${emoji[this.get().extraData()]}` } to`
                to = GetAddressFromPubKeyHash(Buffer.from(this.get().contentPKHTargeted(), 'hex'))
                if (this.get().senderPKH() === pkh)
                    from = 'You'
                else 
                    from = GetAddressFromPubKeyHash(Buffer.from(this.get().senderPKH(), 'hex'))
            } else if (this.isProposal()){
                action = `New ${this.get().extraData()} proposal`
                to = GetAddressFromPubKeyHash(Buffer.from(this.get().contentPKH(), 'hex'))
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
        const valueAtCreationTime = (): BigInt => this.state.value.at_time
        const valueNow = (): number => this.state.value.now

        const CCH = (): string => this.state.fetched_at_cch
        const MR = () => Number(BigInt(valueNow()) / BigInt(valueAtCreationTime() as any))

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

        const currentValue = (CCHList: string[]) => CalculateOutputMeltedValue(valueAtCreationTime(), meltedValueRatio(CCHList))
        const contentPKH = (): string => this.state.link.from
        const contentPKHTargeted = (): string => this.state.link.to
     
        return {
            senderPKH: (): string => this.state.pubkh.sender,
            recipientPKH: (): string => this.state.pubkh.recipient,
            txID: (): string => this.state.tx_id,
            createdAt: () => new Date(this.state.time),
            height: (): number => this.state.lh,
            contentUUID: (): string => PubKeyHashHexToUUID(contentPKH()),
            contentTargetedUUID: (): string => PubKeyHashHexToUUID(contentPKHTargeted()),
            contentPKH,
            contentPKHTargeted,
            extraData: (): string => this.state.extra_data,
            currentValue,
            valueAtCreationTime
        }
    }
}

export class UnserializedPutList extends Collection {

    constructor(list: IUnserializedPut[] = [], options: any){
        super(list, [UnserializedPut, UnserializedPutList], options)
    }

    sortByTime = () => this.orderBy('time', 'desc') as UnserializedPutList

    get = () => {
        const inputs = (pkhHex: string): UnserializedPutList => this.filter((p: UnserializedPut) => p.get().senderPKH() == pkhHex) as UnserializedPutList
        const outputs = (pkhHex: string): UnserializedPutList => this.filter((p: UnserializedPut) => p.get().recipientPKH() == pkhHex) as UnserializedPutList
        const rewards = () => this.filter((p: UnserializedPut) => p.isReward()) as UnserializedPutList
        const betweenDates = (from: Date, to: Date) => this.filter((p: UnserializedPut) => from <= p.get().createdAt() && to >= p.get().createdAt()) as UnserializedPutList
       
        const votePowerDistribution = (): UnserializedPutList => this.filter((p: UnserializedPut) => p.isLughTx()) as UnserializedPutList

        const atDay = (dayDate: Date): UnserializedPutList => {
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
        
        const totalVotePower = (): BigInt => {
            let total = BigInt(0)

            this.forEach((p: UnserializedPut) => {
                if (p.isLughTx()){
                    total = BigInt(total as any) + BigInt(p.get().valueAtCreationTime() as any)
                }
            })

            return total
        }

        const votePowerPercent = (lh: number): number => {
            const total_vp = totalVotePower()
            if (total_vp === BigInt(0))
                return 0
            const total = Number(BigInt(total_vp as any) / BigInt(10))
            if (lh >= CYCLE_IN_LUGH){
                const max = CYCLE_IN_LUGH * (LUGH_AMOUNT / 10)
                return total / max
            }
            const max = lh * (LUGH_AMOUNT/ 10)
            return (total / max) * 100
        }

        const totalReceivedDonationSince = (since: Date, pkhHex: string) => {
            const now = new Date()
            let total = BigInt(0)

            betweenDates(since, now).forEach((p: UnserializedPut) => {
                if (p.isReward() && p.get().senderPKH() != pkhHex){
                    total = BigInt(total as any) + BigInt(p.get().valueAtCreationTime() as any)
                }
            })
            return total
        }

        const activity = (pkhHex: string) => {

            const atDayActivity = (d: Date) => {
                let total = BigInt(0)
                atDay(d).forEach((p: UnserializedPut) => {
                    if (p.isVote() || p.isThread() || p.isRethread() || p.isProposal() || (p.isReward() && p.get().senderPKH() != pkhHex)){
                        total = BigInt(total as any) + BigInt(p.get().valueAtCreationTime() as any)
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
            rewards, betweenDates,
            totalReceivedDonationSince,
            totalVotePower,
            atDay,
            votePowerPercent,
            activity, votePowerDistribution
        }
    }

    _handleJSONResponse = (json: any) => {
        json.list = json.list || []
        let countAdded = 0 
        for (const put of json.list){
            if (this.indexOf(put) == -1) {
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
                    this._handleJSONResponse(json)
                }
                return response.status
            } catch (e){
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
                    this._handleJSONResponse(json)
                }
                return response.status
            } catch (e){
                throw new Error(e)
            }
        }

        return { fromTX, all }
    }
}