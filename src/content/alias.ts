import { Model } from "acey";
import axios from 'axios'
import config from "../config";

interface IAlias {
    address: string
    pp: null | string
    username: string
}

export class Alias extends Model {

    static fetch = async (address: string): Promise<Alias|null> => {
        try {
            const res = await axios(config.getRootAPIContentUrl() + '/alias/' + address)
            if (res.status == 200)
                return new Alias(res.data, {})
            return null
        } catch (e){
            throw e
        }
    }

    constructor(state: IAlias, options: any){
        super(state, options) 
    }

    make = async () => {
        try {
            const res = await axios(config.getRootAPIContentUrl() + '/alias', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                data: this.to().plain(),
                timeout: 10_000
            })
            if (res.status == 200){
                this.setState(res.data)
            }
            return res
        } catch (e){
            throw e
        }
    }

    get = () => {
        return {
            address: (): string => this.state.address,
            pp: (): null | string => this.state.pp,
            username: (): string => this.state.string
        }
    }
}


