import { Model } from "acey";
import * as bip32 from 'bip32'
import { BuildSignatureHex } from 'wallet-util'
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
            const res = await axios(config.getRootAPIOffChainUrl() + '/alias/' + address)
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

    sign = (wallet: bip32.BIP32Interface) => {
        if (this.get().username().length == 0)
            throw new Error("No username set.")

        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().username()))
        return {
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
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
            address: (): string => this.state.address,
            pp: (): null | string => this.state.pp,
            username: (): string => this.state.username
        }
    }
}


