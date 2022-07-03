import { Model } from 'acey'
import { B64ToByteArray, PubKeyHashFromAddress, Sha256, BuildSignature } from 'wallet-util'
import { Constitution, ScriptEngine } from 'wallet-script'
import { Buffer } from 'buffer'
import axios from 'axios'
import { T_REWARD } from 'community-coin-types'

// import AuthContract from './auth-contract'
import FeesModel from './fees'
import CostsModel from './costs'
import KeysModel from './keys'
import CCHModel from './cch'
import InfoModel from './info'

import { InputModel, TransactionModel, UTXOCollection } from '../transaction'

import config from '../config'
import TxBuild from './tx-builder' 

import { BURNING_RATIO } from '../constant'
import { ThreadModel } from '../off-chain'

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
            // contract: new AuthContract(initialState.contract, this.kids()),
            fees: new FeesModel(initialState.fees, this.kids()),
            info: new InfoModel(initialState.info, this.kids()),
            costs: new CostsModel(initialState.costs, this.kids()),
        })
    }

    synchronize = async () => {
        // await this.auth().refresh()
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
            // this.auth().setState(json.contract)
            this.fees().setState(json.fees)
            this.utxos().get().setState(json.utxos || [])
            this.costs().setState(json.costs)
            this.action().store()
            await this.keys().fetch().aliasIfNotSet()
        }
    }

    public keys = (): KeysModel => this.state.seed
    // public auth = (): AuthContract => this.state.contract
    public fees = (): FeesModel => this.state.fees
    public costs = (): CostsModel => this.state.costs
    public info = (): InfoModel => this.state.info
    public balance = (): number => this.utxos().get().get().totalMeltedValue(this.cch().get().list()) 
    public cch = (): CCHModel => this.state.cch

    buildTX = () => {

        const proposal = () => {
            
            const application = async () => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce() + 1
    
                const script = new ScriptEngine([]).append().applicationProposalScript(contentNonce, this.keys().get().derivedPubHash(contentNonce)) 

                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            const cost = async (threadCost: BigInt, proposalCost: BigInt) => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce() + 1

                const script = new ScriptEngine([]).append().costProposalScript(contentNonce, this.keys().get().derivedPubHash(contentNonce), threadCost, proposalCost)

                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            const constitution = async (constitution: Constitution.TConstitution) => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce() + 1

                const script = new ScriptEngine([]).append().constitutionProposalScript(contentNonce, this.keys().get().derivedPubHash(contentNonce), constitution) 
                
                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            return { constitution, application, cost }
        }

        const toAddress = async (address: string, amount: number): Promise<TransactionModel | null> => {
            await this.synchronize()

            const script = new ScriptEngine([]).append().lockScript(PubKeyHashFromAddress(address))

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [amount],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const thread = async () => {
            await this.synchronize()
            const contentNonce = this.info().get().contentNonce() + 1

            const script = new ScriptEngine([]).append().threadScript(contentNonce, this.keys().get().derivedPubHash(contentNonce))
            
            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [this.costs().get().thread()],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const rethread = async (targetPKH: Buffer) => {
            await this.synchronize()
            const contentNonce = this.info().get().contentNonce() + 1
            const contentPKH = this.keys().get().derivedPubHash(contentNonce)

            const script = new ScriptEngine([]).append().rethreadScript(contentNonce, contentPKH, targetPKH)

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
    
            const scriptReward = new ScriptEngine([]).append().rewardScript(targetPKH, 1)
            const scriptDistribution = new ScriptEngine([]).append().lockScript(PubKeyHashFromAddress(thread.get().author().get().address()))
            
            const cost = this.costs().get()[rewardType]()
            const burned = Math.floor(BURNING_RATIO * cost)
            const distributed = cost - burned

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [burned, distributed],
                scripts: [scriptReward.bytes(), scriptDistribution.bytes()]
            })

            return await builder.newTx()
        }

        const vote = async (targetPKH: Buffer, accept: boolean) => {
            await this.synchronize()
            const script = new ScriptEngine([]).append().voteScript(targetPKH, accept)

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [1],
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
                    headers: this.sign().header(),
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
        const value = (val: Buffer) => BuildSignature(this.keys().get().priv(), val)

        const transaction = async (tx: TransactionModel) => {

            const n = await tx.get().inputs().fetchPrevTxList(this.sign().header(), this.utxos().get())
            n > 0 && this.utxos().get().action().store()

            tx.get().inputs().forEach((input: InputModel) => {
                const utxo = this.utxos().get().get().UTXOByTxHashAndVout(input.get().prevTxHash(), input.get().vout())
                if (!utxo)
                    throw new Error("Unfound UTXO")
                const prevTx = utxo.get().tx() as TransactionModel
                
                input.setState({ script_sig: new ScriptEngine([]).append().unlockScript(
                    Buffer.from(this.sign().value(prevTx.get().hash())), 
                    this.keys().get().pub() 
                ).base64()  })                
            })
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

                const toSignStr = this.keys().get().pubHex() + `${year}-${month}-${day}`

                return {
                    pubkey: this.keys().get().pubHex(),
                    signature: value(Sha256(toSignStr)).toString('hex')
                }
            }
        }
    }

}

