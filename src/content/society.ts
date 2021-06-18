import { Model } from "acey";
import { ISociety } from "./interfaces";

export default class Society extends Model {

    constructor(state: ISociety, options:any){
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