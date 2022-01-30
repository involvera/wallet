import { Collection, Model } from "acey";
import { InfoModel as WalletInfoModel } from '../wallet/info'
import * as bip32 from 'bip32'
import { Buffer } from 'buffer'
import { BuildSignatureHex, PubKeyHashFromAddress } from 'wallet-util'
import axios from 'axios'
import config from "../config";

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

    static fetch = async (address: string): Promise<AliasModel|null> => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias/address/' + address, {
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

    constructor(state: IAlias = DEFAULT_STATE, options: any){
        super(state, options) 
    }

    getWalletInfo = () => this._walletInfo

    sign = (wallet: bip32.BIP32Interface) => {
        if (this.get().username().length == 0)
            throw new Error("No username set.")

        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().username()))
        return {
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        }
    }

    fetchWalletInfo = async () => {
        try {
            const wi = await WalletInfoModel.fetch( PubKeyHashFromAddress(this.get().address()).toString('hex'))
            if (wi)
                this._walletInfo = wi
            return wi
        } catch (e: any){
            throw new Error(e)
        }
    }

    update = async (wallet: bip32.BIP32Interface) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias', {
                method: 'POST',
                headers: Object.assign({ 'content-type': 'application/json'}, this.sign(wallet)),
                data: this.to().string(),
                timeout: 10_000,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
            })
            if (res.status == 200 || res.status == 201){
                this.setState(res.data).store()
            }
            return res
        } catch (e){
            throw e
        }
    }

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
            address: (): string => this.state.address
        }
    }
}

export class AliasCollection extends Collection {

    constructor(initialState: any, options: any){
        super(initialState, [AliasModel, AliasCollection], options)
    }

    pullByAddresses = async (addresses: string[]) => {
        try {
            const res = await axios(config.getRootAPIOffChainUrl() + `/alias/addresses/${JSON.stringify(addresses)}`,  {
                headers: {
                    filter: 'author'
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