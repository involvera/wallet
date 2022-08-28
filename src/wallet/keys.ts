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

    unlock = (password: string = DEFAULT_PASS) => {
        if (this._hashPass(password) !== this.get().passHash()){
            throw new Error("wrong unlocking password")
        }
        this._password = password
        AES.decrypt(this._256BitsPass(), Inv.InvBuffer.fromHex(this.state.mnemonic).bytes()).then((val: Uint8Array) => {
            this._mnemonic = new Inv.InvBuffer(val).hex()
        })
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
        this.get().alias().setAddress(this.get().address().get())
        return this.action()   
    }

    is2 = () => {
        return {
            locked: () => !this._password,
            unlocked: () => !!this._password,
            set: () => this.state.mnemonic.length > 0
        }
    }

    fetch = () => {
        const alias = async () => {
            const alias = await AliasModel.fetch(this.get().address().get())
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
        const alias = (): AliasModel => this.state.alias 
        const master = () => mnemonic().wallet()
        const wallet = () => master().derive('m/0/0')
        const pub = () => wallet().publicKey()
        const pubHash = () => pub().hash()
        const address = () => pubHash().toAddress()
        const passwordClear = () => this._password

        const mnemonic = () => {
            this._triggerPasswordError()
            return new Inv.Mnemonic(this._mnemonic)
        } 

        const derivedPubHash = (nonce: number) => derivedPub(nonce).hash()
        const contentWallet = (nonce: number) => master().derive('m/1/' + nonce.toString())
        const derivedPub = (nonce: number) => contentWallet(nonce).publicKey()

        return {
            passHash,
             master, wallet, pub, 
            pubHash,
            derivedPub, address, 
            derivedPubHash, mnemonic,
            contentWallet, alias,
            passwordClear
        }
    }
}