import { Model, Collection } from "acey";
import axios from 'axios'
import moment from "moment";
import { OFFCHAIN } from 'community-coin-types'
import { Inv } from "wallet-util";

import config from "../../config";
import CostsModel from '../../wallet/costs'
import { SocietyStatsModel } from './stats'
import {ContributorCollection  } from './contributor'
import { ConstitutionModel} from '../constitution'

const DEFAULT_STATE: OFFCHAIN.ISociety = {
    id: 0,
    created_at: new Date(),
    name: '',
    path_name: '',
    description: '',
    domain: '',
    currency_route_api: '',
    currency_symbol: '',
    pp: null,
    stats: SocietyStatsModel.DefaultState,
    constitution: ConstitutionModel.DefaultState,
    costs: CostsModel.DefaultState
}

export class SocietyModel extends Model {

    static DefaultState: OFFCHAIN.ISociety = DEFAULT_STATE 

    static fetch = async (id: number): Promise<SocietyModel|null> => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/society/' + id.toString(), {
                headers: {
                    'content-type': 'application/json'
                },
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return new SocietyModel(res.data, {})
            }                
            return null
        } catch (e){
            throw e
        }
    }

    constructor(state = DEFAULT_STATE, options:any) {
        super(state, options)
        this.setState({
            stats: new SocietyStatsModel(state.stats, this.kids()),
            costs: new CostsModel(state.costs, this.kids()),
            constitution: new ConstitutionModel(state.constitution, this.kids()),
            contributors: new ContributorCollection((state as any).contributors || [], this.kids()),
            created_at: state.created_at ? new Date(state.created_at) : new Date()
        })
    }

    fetchContributor = async (addr: Inv.Address) => {
        try {
            const res = await axios(config.getRootAPIChainUrl() + `/wallet/${addr.toPKH().hex()}`, {
                headers: {
                    'content-type': 'application/json'
                },
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const idx = this.get().contributors().findIndex({ addr: addr.get() })
                const d = Object.assign({addr: addr.get(), sid: this.get().id()}, res.data)
                idx == -1 ? this.get().contributors().push(d) : this.get().contributors().updateAt(d, idx)
            }
            return res
        } catch (e) {
            throw e
        }
    }

    get = () => {
        const id = (): number => this.state.id
        const created_at = (): Date => this.state.created_at
        const name = (): string => this.state.name
        const pathName = (): string => this.state.path_name
        const description = (): string => this.state.description
        const domain = (): string => this.state.domain
        const currencySymbol = (): string => this.state.currency_symbol
        const currencyRouteAPI = (): string => this.state.currency_route_api
        const stats = (): SocietyStatsModel => this.state.stats
        const costs = (): CostsModel => this.state.costs
        const constitution = (): ConstitutionModel => this.state.constitution
        const contributors = (): ContributorCollection => this.state.contributors
        const pp = (): string | null => this.state.pp || null
        const formatedMonthYearCreationDate = (): string => moment(created_at()).format('MMMM YYYY')

        return {
            id, created_at, name,pathName, description,
            domain, currencySymbol, currencyRouteAPI,
            stats, costs, constitution, contributors,
            pp, formatedMonthYearCreationDate
        }
    }
}

export class SocietyCollection extends Collection {
    constructor(state: any[], options:any){
        super(state, [SocietyModel, SocietyCollection], options)
    }

    reset = () => this.setState([])
}