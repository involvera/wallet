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

    sign = (wallet: bip32.BIP32Interface) => {
        const sig = BuildSignatureHex(wallet, Buffer.from(this.get().username()))
        return {
            public_key: sig.public_key_hex,
            signature: sig.signature_hex
        }
    }

    make = async (wallet: bip32.BIP32Interface) => {
        try {
            const res = await axios(config.getRootAPIContentUrl() + '/alias', {
                method: 'POST',
                headers: Object.assign({ 'content-type': 'application/json'}, this.sign(wallet)),
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


