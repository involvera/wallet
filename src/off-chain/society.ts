import { Collection, Model } from "acey";
import { ISociety, ISocietyStats } from "./interfaces";
import axios from 'axios'
import moment from "moment";

import config from "../config";
import { AliasCollection } from "./alias";
import Constitution, { DEFAULT_STATE as ConstiDS } from './constitution'
import Costs, { DEFAULT_STATE as CostsDS } from '../wallet/costs'
import { IContributorStats } from ".";

const DEFAULT_STATE: ISociety = {
    id: 0,
    created_at: new Date(),
    name: '',
    description: '',
    domain: '',
    currency_route_api: '',
    currency_symbol: '',
    pp: null,
    stats: {
        total_contributor: 0,
        last_height: 0,
        active_addresses: 0,
        most_active_addresses: [] as any,
        circulating_supply:  '',
        circulating_vp_supply : ''
    },
    contributor: {
        addr: '',
        position: 0,
        sid: 0,
    },
    constitution: ConstiDS,
    costs: CostsDS
}

export class SocietyStatsModel extends Model {
    
    constructor(state: ISocietyStats, options: any){
        super(state, options)
        this.setState({
            most_active_addresses: new AliasCollection(state.most_active_addresses, this.kids()),
        })
    }

    get = () => {
        return {
            lastHeight: (): number => this.state.last_height,
            totalContributor: (): number => this.state.total_contributor,
            activeAddresses: (): number => this.state.active_addresses,
            mostActiveAddresses: (): AliasCollection => this.state.most_active_addresses,
            circulatingSupply: (): BigInt => BigInt(this.state.circulating_supply), 
            circulatingVPSupply: (): BigInt => BigInt(this.state.circulating_vp_supply),
        }
    }
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
            constitution: new Constitution(state.constitution, this.kids()),
        })
    }

    isContributorFetch = () => this.get().contributor().addr == ''

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
        const constitution = (): Constitution => this.state.constitution
        const contributor = (): IContributorStats => this.state.contributor
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