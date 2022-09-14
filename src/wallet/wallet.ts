import { Model } from 'acey'
import { Lib, Inv} from 'wallet-util'
import { Constitution, Script } from 'wallet-script'
import axios from 'axios'
import { T_REWARD } from 'community-coin-types'

import FeesModel from './fees'
import CostsModel from './costs'
import KeysModel from './keys'
import CCHModel from './cch'
import InfoModel from './info'

import { InputModel, OutputModel, TransactionModel, UTXOCollection } from '../transaction'

import config from '../config'
import TxBuild from './tx-builder' 

import { BURNING_RATIO } from '../constant'
import { ThreadModel } from '../off-chain'
import { DEFAULT_PASS, DEFAULT_PASS_HASH } from '../constant/off-chain'

const{
    Hash: {
        Sha256
    }
} = Lib

export interface IHeaderSignature {
    pubkey: string
    signature: string
}

export default class Wallet extends Model {

    constructor(initialState: any, options: any){
        super(initialState, options)
        this.setState({
            seed: new KeysModel(initialState.seed, this.kids()),
            utxos: new UTXOCollection(initialState.utxos || [], this.kids()),
            cch: new CCHModel(initialState.cch, this.kids()),
            fees: new FeesModel(initialState.fees, this.kids()),
            info: new InfoModel(initialState.info, this.kids()),
            costs: new CostsModel(initialState.costs, this.kids()),
        })
    }

    generateRandomSeed = () => {
        this.keys().set(Inv.Mnemonic.random().get(), DEFAULT_PASS)
        return this.action()
    }

    reset = () => {
        this.setState({
            seed: new KeysModel(undefined, this.kids()),
            utxos: new UTXOCollection([], this.kids()),
            cch: new CCHModel(undefined, this.kids()),
            fees: new FeesModel(undefined, this.kids()),
            info: new InfoModel(undefined, this.kids()),
            costs: new CostsModel(undefined, this.kids()),
        })

        return this.generateRandomSeed()
    }

    synchronize = async () => {
        try {
            const response = await axios(config.getRootAPIChainUrl() + '/wallet', {
                headers: Object.assign(this.sign().header() as any, {
                    last_cch: this.cch().get().last(),
                }),
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
                timeout: 10000,
            })
            if (response.status == 200){
                const json = response.data
                this.setState({ info: new InfoModel(json.info, this.kids()) })
                this.cch().assignJSONResponse(json.cch)
                this.fees().setState(json.fees)
                this.utxos().get().setState(json.utxos || [])
                this.costs().setState(json.costs)
                this.action().store()
                await this.keys().fetch().alias()
            }
        } catch (e){
            console.log(e)
        }
    }

    public is2 = () => {
        const generatedWallet = () => this.keys().get().passHash() === DEFAULT_PASS_HASH
        const activeWallet = () => this.info().get().votePowerCount().gt(0) || this.balance().gt(0)

        return {
            generatedWallet,
            activeWallet
        }
    }

    public keys = (): KeysModel => this.state.seed
    public fees = (): FeesModel => this.state.fees
    public costs = (): CostsModel => this.state.costs
    public info = (): InfoModel => this.state.info
    public balance = (): Inv.InvBigInt => this.utxos().get().get().totalMeltedValue(this.cch().get().list()) 
    public cch = (): CCHModel => this.state.cch

    buildTX = () => {

        const proposal = () => {
            
            const application = async () => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce().add(1)
    
                const script = Script.build().applicationProposal(contentNonce, this.keys().get().contentPubKey(contentNonce).hash()) 

                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            const cost = async (threadCost: Inv.InvBigInt, proposalCost: Inv.InvBigInt) => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce().add(1)

                const script = Script.build().costProposalScript(contentNonce, this.keys().get().contentPubKey(contentNonce).hash(), threadCost, proposalCost)

                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            const constitution = async (constitution: Constitution.TConstitution) => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce().add(1)

                const script = Script.build().constitutionProposalScript(contentNonce, this.keys().get().contentPubKey(contentNonce).hash(), constitution) 
                
                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            return { constitution, application, cost }
        }

        const toAddress = async (address: Inv.Address, amount: Inv.InvBigInt): Promise<TransactionModel | null> => {
            await this.synchronize()

            const script = Script.build().lockScript(address.toPKH())

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [amount],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const thread = async () => {
            await this.synchronize()
            const contentNonce = this.info().get().contentNonce().add(1)

            const script = Script.build().threadScript(contentNonce, this.keys().get().contentPubKey(contentNonce).hash())
            
            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [this.costs().get().thread()],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const rethread = async (targetPKH: Inv.PubKH) => {
            await this.synchronize()
            const contentNonce = this.info().get().contentNonce().add(1)
            const contentPKH = this.keys().get().contentPubKey(contentNonce).hash()

            const script = Script.build().rethreadScript(contentNonce, contentPKH, targetPKH)

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [this.costs().get().thread()],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const reward = async (thread: ThreadModel, rewardType: T_REWARD) => {
            await this.synchronize()
            const targetPKH = thread.get().contentLink().get().output().get().contentPKH()
    
            const scriptReward = Script.build().rewardScript(targetPKH, new Inv.InvBigInt(1))
            const scriptDistribution = Script.build().lockScript(thread.get().author().get().address().toPKH())
            
            const cost = this.costs().get()[rewardType]()
            const burned = new Inv.InvBigInt(cost.mulDecimals(BURNING_RATIO))
            const distributed = cost.sub(burned)

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [burned, distributed],
                scripts: [scriptReward.bytes(), scriptDistribution.bytes()]
            })

            return await builder.newTx()
        }

        const vote = async (targetPKH: Inv.PubKH, accept: boolean) => {
            await this.synchronize()
            const script = Script.build().voteScript(targetPKH, accept)

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [new Inv.InvBigInt(1)],
                scripts: [script.bytes()]
            })
        
            return await builder.newTx()
        }
        
        return { 
            toAddress, proposal, vote,
            thread, rethread, reward 
        }
    }

    utxos = () => {
        const get = (): UTXOCollection => this.state.utxos
        const fetch = async () => {
            // await this.auth().refresh()
            try {
                const res = await axios(config.getRootAPIChainUrl() + '/utxos', {
                    method: 'GET',
                    headers: this.sign().header() as any,
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                if (res.status == 200){
                    const json = res.data
                    get().setState(json.utxos || []).store()
                }
                return res.status
            } catch (e: any){
                throw new Error(e)
            }
        }
        return { get, fetch }
    }

    sign = () => {
        const value = (d: Uint8Array | string) => this.keys().get().wallet().sign(d)
        const transaction = (tx: TransactionModel) => {
            const inputs = tx.get().inputs()
            for (let i = 0; i < inputs.count(); i++){
                const input = inputs.nodeAt(i) as InputModel
                const script_sig = Script.build().unlockScript(value(input.get().prevTxHash()?.bytes() as Uint8Array), this.keys().get().pub()).base64() 
                input.setState({ script_sig })
            }
            return true
        }
        
        return {
            value,
            transaction,
            header: (): IHeaderSignature => {
                const now = new Date()
                const year = now.getUTCFullYear().toString()
                let month = (now.getUTCMonth() + 1).toString()
                month = month.length == 1 ? '0' + month : month
                let day = now.getUTCDate().toString()
                day = day.length == 1 ? '0' + day : day

                const toSignStr = this.keys().get().pub().hex() + `${year}-${month}-${day}`
                const sigPlain = this.keys().get().wallet().sign(toSignStr).get().plain()
                return {
                    pubkey: sigPlain.public_key,
                    signature: sigPlain.signature
                }
            }
        }
    }

}

