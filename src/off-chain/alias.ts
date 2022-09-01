import { Collection, Model } from "acey";
import WalletInfoModel from '../wallet/info'
import axios from 'axios'
import config from "../config";
import { Inv } from "wallet-util";

export interface IAlias {
    pp: string | null,
    username: string,
    address: string
}

const DEFAULT_STATE: IAlias = {
    pp: null,
    username: '',
    address: ''
}

export class AliasModel extends Model {

    static DefaultState: IAlias = DEFAULT_STATE

    _walletInfo: WalletInfoModel | null = null

    static fetch = async (address: Inv.Address): Promise<AliasModel|null> => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias/address/' + address.get(), {
                headers: {
                    'content-type': 'application/json'
                },
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200)
                return new AliasModel(res.data, {})
            return null
        } catch (e){
            throw e
        }
    }

    static isUsernameAlreadyUsed = async (username: string) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias/' + username, {
                method: 'HEAD',
                headers:{
                    'content-type': 'application/json'
                },
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status === 404)
                return false
            if (res.status === 200)
                return true
        } catch (e){
            throw e
        }
        return null
    }

    constructor(state: IAlias = DEFAULT_STATE, options: any){
        super(state, options) 
    }

    reset = () => this.setState(DEFAULT_STATE)

    getWalletInfo = () => this._walletInfo

    sign = (wallet: Inv.PrivKey, data: string) => {
        if (this.get().username().length == 0)
            throw new Error("No username set.")
        return wallet.sign(data).get().plain()
    }

    fetchBigPP = async (): Promise<string | null> => {
        if (!this.get().username())
            return null        
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/alias/${this.get().username()}/pp/500`, {
                method: 'GET',
                timeout: 10_000,
            })
            if (res.status === 200){
                return res.data || null
            }
            return null
        } catch (e: any){
            throw new Error(e)
        }
    }

    fetchWalletInfo = async () => {
        try {
            const wi = await WalletInfoModel.fetch(this.get().address().toPKH().hex())
            if (wi)
                this._walletInfo = wi
            return wi
        } catch (e: any){
            throw new Error(e)
        }
    }

    buildPP = async (imageBase64: string) => {
        const data = JSON.stringify({
            image: imageBase64
        })
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/asset/pp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data,
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status <= 500;
                },
            })
            return {status: res.status, data: res.data}
        } catch (e: any){
            return {status: 500, data: e.toString()}
        }
    }

    updatePP = async (d: {pp: string, pp500: string, asset_name: string}, wallet: Inv.PrivKey) => {
        try {
            const data = JSON.stringify(d) 
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias/pp', {
                method: 'POST',
                headers: Object.assign({ 'content-type': 'application/json'}, wallet.sign(data).get().plain() as any),
                data,
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status <= 500;
                }
            })
            res.status <= 201 && this.setState({pp: d.pp}).store()
            return res
        } catch (e){
            throw e
        }
    }

    updateUsername = async (wallet: Inv.PrivKey, origin_sid: number) => {
        const body = JSON.stringify({ username: this.get().username(), origin_sid })
        
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias/username', {
                method: 'POST',
                headers: Object.assign({ 'content-type': 'application/json'}, wallet.sign(body).get().plain() as any),
                data: body,
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status <= 500;
                },
            })
            res.status <= 201 && this.setState(res.data).store()
            return res
        } catch (e){
            throw e
        }
    }

    setAddress = (address: Inv.Address) => this.setState({ address: address.get()})

    setUsername = (username: string) => {
        if (!username.match(/^[a-z0-9_]{3,16}$/))
            throw new Error("Wrong username pattern: 3-16 characters with a-z,0-9 and _ allowed characters.")
        return this.setState({ username })
    }

    setPP = (ppURI: string) => {
        if (ppURI.length > 255)
            throw new Error("Too long uri, max 255 characters.")
        return this.setState({ pp: ppURI })
    } 

    get = () => {
        return {
            pp: (): null | string => this.state.pp,
            username: (): string => this.state.username,
            address: () => new Inv.Address(this.state.address)
        }
    }
}

export class AliasCollection extends Collection {

    constructor(initialState: any, options: any){
        super(initialState, [AliasModel, AliasCollection], options)
    }

    reset = () => this.setState([])

    pullByAddresses = async (addresses: string[]) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/alias/addresses/${JSON.stringify(addresses)}`,  {
                headers: {
                    filter: 'author',
                    'content-type': 'application/json'
                },
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                const data = res.data
                for (let i = 0; i < data.length; i++){
                    if (!this.find({address: data[i].address})){
                        this.push(data[i])
                    }
                }
                this.save().store()
            }
        } catch (e: any){
            return e.toString()
        }
    }
}