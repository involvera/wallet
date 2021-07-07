import { Collection, Model } from "acey";
import { ISociety } from "./interfaces";
import axios from 'axios'
import config from "../config";

const DEFAULT_STATE: ISociety = {
    id: 0,
    created_at: new Date(),
    name: '',
    description: '',
    domain: '',
    currency_route_api: '',
    currency_symbol: ''
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
    }

    get = () => {
        const id = () => this.state.id
        const created_at = () => this.state.created_at
        const name = () => this.state.name
        const description = () => this.state.description
        const domain = () => this.state.domain
        const currencySymbol = () => this.state.currency_symbol
        const currencyRouteAPI = () => this.state.currency_route_api

        return {
            id, created_at, name, description,
            domain, currencySymbol, currencyRouteAPI
        }
    }
}

export class SocietyCollection extends Collection {
    constructor(state: any[], options:any){
        super(state, options)
    }
}