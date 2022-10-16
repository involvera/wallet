import { Model } from 'acey'
import { AliasModel, IAlias } from '../off-chain'
import { DEFAULT_PASS } from '../constant/off-chain'
import { Inv, Lib } from 'wallet-util'

const {
    Hash: {
        Sha256,
        Ripemd160
    },
    AES
} = Lib

export interface IKey {
    pass_hash: string
    mnemonic: string
    alias: IAlias
}

const DEFAULT_STATE = {
    pass_hash: '',
    mnemonic: '',
    alias: AliasModel.DefaultState
}

export default class KeysModel extends Model {

    static DefaultState: IKey = DEFAULT_STATE
    
    private _password: string = ''
    private _mnemonic: string = ''
    constructor(initialState: IKey = DEFAULT_STATE, options: any){
        super(initialState, options)
        this.setState({
            alias: new AliasModel(initialState.alias, this.kids())
        })
    }

    private _hashPass = (pass: string) => new Inv.InvBuffer(Sha256(Ripemd160(pass))).hex()
    private _256BitsPass = () => Sha256(this.get().passwordClear())

    private _triggerPasswordError = () => {
        if (this.get().passwordClear() === ''){
            throw new Error("password is not set")
        }
        this.unlock(this.get().passwordClear())
    }

    unlock = async (password: string = DEFAULT_PASS) => {
        if (this._hashPass(password) !== this.get().passHash()){
            throw new Error("wrong unlocking password")
        }
        this._password = password
        try {
            const val = await AES.decrypt(this._256BitsPass(), Inv.InvBuffer.fromHex(this.state.mnemonic).bytes())
            this._mnemonic = new Inv.InvBuffer(val).toString()
        } catch (e){
            throw new Error("internal error")
        }
    }

    lock = () => {
        this._password = ""
        this._mnemonic = ""
    }

    set = async (mnemonic: string, unlockingPassword: string = DEFAULT_PASS) => {
        if (unlockingPassword.length === 0){
            throw new Error("unlocking password cannot be empty")
        } 
        //checking error
        this._mnemonic = new Inv.Mnemonic(mnemonic).get()
        this.setState({ pass_hash: this._hashPass(unlockingPassword)})
        this.unlock(unlockingPassword)
        const mnemonicEncrypted = new Inv.InvBuffer(await AES.encrypt(this._256BitsPass(), Inv.InvBuffer.fromRaw(mnemonic).bytes()))
        this.setState({  mnemonic: mnemonicEncrypted.hex() })
        this.get().alias().setAddress(this.get().address())
        return this.action()   
    }

    is2 = () => {
        return {
            locked: () => !this._mnemonic,
            unlocked: () => !!this._mnemonic,
            set: () => this.state.mnemonic.length > 0
        }
    }

    fetch = () => {
        const alias = async () => {
            const alias = await AliasModel.fetch(this.get().address())
            if (alias){
                this.setState({ alias: new AliasModel(alias.to().plain(), this.kids()) }).save().store()
            }
        }

        return {
            alias,
        }
    }


    get = () => {
        const passHash = (): string => this.state.pass_hash
        const mnemonic = () => {
            this._triggerPasswordError()
            return new Inv.Mnemonic(this._mnemonic)
        } 
        const alias = (): AliasModel => this.state.alias 
        const wallet = () => mnemonic().wallet()
        const pub = () => wallet().publicKey()
        const pubHash = () => pub().hash()
        const address = () => pubHash().toAddress()
        const passwordClear = () => this._password

        const contentWallet = (nonce: Inv.InvBigInt) => mnemonic().deriveForContent(nonce.number())
        const contentPubKey = (nonce: Inv.InvBigInt) => contentWallet(nonce).publicKey()

        return {
            mnemonic,
            passHash,
            wallet, 
            pub, 
            pubHash,
            address, 
            contentWallet,
            contentPubKey, 
            alias,
            passwordClear
        }
    }
}