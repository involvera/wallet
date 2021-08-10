import { Model, Collection } from "acey";
import axios from 'axios'
import moment from "moment";

import config from "../../config";
import { DEFAULT_STATE as DEFAULT_SOCIETY_STATS_STATE  } from './stats'
import {ConstitutionModel,  DEFAULT_STATE as ConstiDS } from '../constitution'
import Costs, { DEFAULT_STATE as CostsDS } from '../../wallet/costs'
import { IConstitutionData } from '../constitution'
import { ICost } from '../../wallet/costs'
import { SocietyStatsModel,ISocietyStats } from './stats'
import { IContributorStats, ContributorModel } from './contributor'
import { Constitution } from "wallet-script";

export interface ISociety {
    id: number
    name: string
    created_at: Date
    currency_symbol: string
    description: string
    domain: string,
    currency_route_api: string
    pp: null
    stats: ISocietyStats
    costs: ICost
    constitution: IConstitutionData
    contributor: IContributorStats
}

const DEFAULT_STATE: ISociety = {
    id: 0,
    created_at: new Date(),
    name: '',
    description: '',
    domain: '',
    currency_route_api: '',
    currency_symbol: '',
    pp: null,
    stats: DEFAULT_SOCIETY_STATS_STATE,
    contributor: {
        addr: '',
        position: 0,
        sid: 0,
    },
    constitution: ConstiDS,
    costs: CostsDS
}

export class SocietyModel extends Model {

    static fetch = async (id: number): Promise<SocietyModel|null> => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/society/' + id.toString(), {
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200)
                return new SocietyModel(res.data, {})
            return null
        } catch (e){
            throw e
        }
    }

    constructor(state: ISociety = DEFAULT_STATE, options:any){
        super(state, options)
        this.setState({
            stats: new SocietyStatsModel(state.stats, this.kids()),
            costs: new Costs(state.costs, this.kids()),
            constitution: new ConstitutionModel(state.constitution, this.kids()),
            contributor: new ContributorModel(state.contributor, this.kids())
        })
    }

    isContributorFetch = () => this.get().contributor().get().addr() == ''

    fetchContributor = async (addr: string) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/society/${this.get().id()}/address/${addr}/stats`, {
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                this.setState({ contributor: res.data })
            }
            return res
        } catch (e){
            throw e
        }
    }

    get = () => {
        const id = (): number => this.state.id
        const created_at = (): Date => this.state.created_at
        const name = (): string => this.state.name
        const description = (): string => this.state.description
        const domain = (): string => this.state.domain
        const currencySymbol = (): string => this.state.currency_symbol
        const currencyRouteAPI = (): string => this.state.currency_route_api
        const stats = (): SocietyStatsModel => this.state.stats
        const costs = (): Costs => this.state.costs
        const constitution = (): ConstitutionModel => this.state.constitution
        const contributor = (): ContributorModel => this.state.contributor
        const pp = (): string | null => this.state.pp || null
        const formatedMonthYearCreationDate = (): string => moment(created_at()).format('MMMM YYYY')

        return {
            id, created_at, name, description,
            domain, currencySymbol, currencyRouteAPI,
            stats, costs, constitution, contributor,
            pp, formatedMonthYearCreationDate
        }
    }
}

export class SocietyCollection extends Collection {
    constructor(state: any[], options:any){
        super(state, options)
    }
}