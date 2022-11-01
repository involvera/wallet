import axios from 'axios'
import { Model, Collection } from 'acey'
import { IHeaderSignature } from '../wallet'
import InfoModel from '../wallet/info'
import { IWalletInfo } from 'community-coin-types'
import { AliasModel, IAlias } from './alias'
import config from '../config'
import { Inv } from 'wallet-util'

export interface IUser {
    alias: IAlias
    info: IWalletInfo
}

const DEFAULT_STATE = {
    alias: AliasModel.DefaultState,
    info: InfoModel.DefaultState
}

export class UserModel extends Model {
    static DefaultState: IUser = DEFAULT_STATE

    static RandomUsername = async () =>{
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/user/name`,  {
                timeout: 10_000,
                headers: {'content-type': 'application/json'},
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return res.data as string
            }
        } catch (e: any){
            throw new Error(e.toString())
        }
        return null
    }

    static FetchByAddress = async (societyID: number, address: Inv.Address, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/user/${societyID}/${address.get()}`,  {
                timeout: 10_000,
                headers: Object.assign({'content-type': 'application/json'}, headerSig || {} as any),
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return new UserModel(res.data, {})
            }
            if (res.status == 404){
                const state = UserModel.DefaultState
                state.alias.address = address.get()
                return new UserModel(state, {})
            }
        } catch (e: any){
            throw new Error(e.toString())
        }
        return null
    }

    constructor(state: IUser = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            info: new InfoModel(state.info, this.kids()),
            alias: new AliasModel(state.alias, this.kids())
        })
    }

    get = () => {
        return {
            alias: (): AliasModel => this.state.alias,
            info: (): InfoModel => this.state.info
        }
    }

    setAlias = (alias: AliasModel) => this.get().alias().copyMetaData(alias)
}

export class UserCollection extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [UserModel, UserCollection], options)
    }

    reset = () => this.setState([])

    addOrUpdate = (user: UserModel) => {
        const index = this.findIndex((u: UserModel) => (u.get().alias().get().address() as Inv.Address).eq(user.get().alias().get().address() as Inv.Address)) 
        return index === -1 ? this.push(user) : this.updateAt(user, index)
    }
    findByAddress = (address: Inv.Address) => this.find((u: UserModel) => (u.get().alias().get().address() as Inv.Address).eq(address)) as UserModel

    setAuthor = (author: AliasModel) => {
        this.forEach((t: UserModel) => t.setAlias(author))
        return this.action()
    }
}

