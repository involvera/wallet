import { Model, Collection } from 'acey'
import { UnserializedPutModel } from '.'
import { PubKeyHashHexToUUID } from 'wallet-util';
import { IUnSerializedPut } from 'community-coin-types'
import { LinkModel } from './link'
import { PubKHModel } from './pubkh'
import ValueModel from './value'
import { IHeaderSignature } from '..';
import axios from 'axios';
import config from '../../config';

const LIMIT = 20

export class RewardPutModel extends Model {

    constructor(state: IUnSerializedPut = UnserializedPutModel.DefaultState, options: any){
        super(state,options)
        this.setState({
            link: new LinkModel(state.link, this.kids()),
            pubkh: new PubKHModel(state.pubkh, this.kids()),
            value: new ValueModel(state.value, this.kids()),
        })
    }

    isUpvote = () => this.get().extraData() === "upvote"
    isReaction0 = () => this.get().extraData() === "reaction_0"
    isReaction1 = () => this.get().extraData() === "reaction_1"
    isReaction2 = () => this.get().extraData() === "reaction_2"

    get = () => {

        const pkh = (): PubKHModel => this.state.pubkh
        const link = (): LinkModel => this.state.link
        const value = (): ValueModel => this.state.value

        const contentPKH = (): string => link().get().from()
        const contentPKHTargeted = (): string => link().get().to()

        return {
            pkh,
            link,
            value,
            txID: (): string => this.state.tx_id,
            createdAt: () => new Date(this.state.time),
            height: (): number => this.state.lh,
            contentUUID: (): string => PubKeyHashHexToUUID(contentPKH()),
            contentTargetedUUID: (): string => PubKeyHashHexToUUID(contentPKHTargeted()),
            contentPKH,
            contentPKHTargeted,
            extraData: (): string => this.state.extra_data,
        }
    }
}

export class RewardPutCollection extends Collection {

    constructor(list: IUnSerializedPut[] = [], options: any){
        super(list, [RewardPutModel, RewardPutCollection], options)
    }

    sortByTime = () => this.orderBy('time', 'desc') as RewardPutCollection


    get = () => {
        const betweenDates = (from: Date, to: Date) => this.filter((p: RewardPutModel) => from <= p.get().createdAt() && to >= p.get().createdAt()) as RewardPutCollection
       
        const atDay = (dayDate: Date): RewardPutCollection => {
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

        const totalSentDonationSince = (since: Date) => {
            const now = new Date()
            let total = BigInt(0)

            betweenDates(since, now).forEach((p: RewardPutModel) => {
                total = BigInt(total as any) + BigInt(p.get().value().get().atCreationTime() as any)
            })
            return total
        }
        
        return {
            totalSentDonationSince,
            betweenDates,
            atDay,
        }
    }

    cleanUpStorage = () => this.setState(this.orderBy('time', 'desc').limit(20).map(o => o)).store()
    loadMore = (headerSignature: IHeaderSignature) => this.fetch(Math.floor(this.count() / LIMIT) * LIMIT, LIMIT, headerSignature)

    assignJSONResponse = (data = []) => {
        let countAdded = 0 
        for (const put of data){
            if (this.indexOf(put) == -1) {
                this.push(put)
                countAdded++
            }
        }
        countAdded > 0 && this.action().store()
        return countAdded
    }

    fetch = async (offset: number, limit: number, headerSignature: IHeaderSignature) => {
        try {
            const response = await axios(config.getRootAPIChainUrl() + '/puts/rewards', {
                method: 'GET',
                headers: Object.assign({}, headerSignature as any, {offset, limit}),
                timeout: 10000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            response.status == 200 && this.assignJSONResponse(response.data)
            return response.status
        } catch (e: any){
            throw new Error(e)
        }
    }
}
