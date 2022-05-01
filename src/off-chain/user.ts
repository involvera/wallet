import axios from 'axios'
import { Model, Collection } from 'acey'
import { IHeaderSignature } from '../wallet'
import InfoModel from '../wallet/info'
import { IWalletInfo } from 'community-coin-types'
import { AliasModel, IAlias } from './alias'
import config from '../config'

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

    static FetchByAddress = async (societyID: number, address: string, headerSig: IHeaderSignature | void) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/user/${societyID}/${address}`,  {
                timeout: 10_000,
                headers: headerSig || {},
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200){
                return new UserModel(res.data, {})
            }
            if (res.status == 404){
                const state = UserModel.DefaultState
                state.alias.address = address
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
}

export class UserCollection extends Collection {
    
    constructor(initialState: any, options: any){
        super(initialState, [UserModel, UserCollection], options)
    }

    addOrUpdate = (user: UserModel) => {
        const index = this.findIndex((u: UserModel) => u.get().alias().get().address() === user.get().alias().get().address())
        return index === -1 ? this.push(user) : this.updateAt(user, index)
    }
}

