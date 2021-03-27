import { Collection, Model } from 'acey'
import { CYCLE_IN_LUGH, ROOT_API_URL, TByte } from '../constant';
import { CalculateOutputMeltedValue } from '../util';
import fetch from 'node-fetch'
import { IHeaderSignature } from './wallet';
import { CONSTITUTION_PROPOSAL_SCRIPT_LENGTH } from '../script/constant';

interface ILink {
    from: string
    to: string
}

interface IPubKH {
    sender: string
    recipient: string
}

interface IValue {
    at_time: number
    now: number
}

interface IUnserializedPut {
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

    get = () => {
        const valueAtCreationTime = (): BigInt => this.state.value.at_time
        const valueNow = (): number => this.state.value.now

        const CCH = (): string => this.state.fetched_at_cch
        const MR = () => Number(BigInt(valueNow()) / BigInt(valueAtCreationTime()))

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
     
        return {
            senderPKH: (): string => this.state.pubkh.sender,
            recipientPKH: (): string => this.state.pubkh.recipient,
            txID: (): string => this.state.tx_id,
            createdAt: () => new Date(this.state.time / 1000),
            height: (): number => this.state.lh,
            contentPKH: (): string => this.state.link.from,
            contentPKHTargeted: (): string => this.state.link.to,
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

    get = () => {


    }

    fetch = async (lastHeight: number, headerSignature: IHeaderSignature) => {
        try { 
            const response = await fetch(ROOT_API_URL + '/puts/list', {
                method: 'GET',
                headers: Object.assign({}, headerSignature as any, {last_lh: lastHeight})
            })
            if (response.status == 200){
                const json = await response.json()
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
            return response.status
        } catch (e){
            throw new Error(e)
        }
    }
}