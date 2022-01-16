import { Model } from 'acey'

import { B64ToByteArray, PubKeyHashFromAddress, Sha256, BuildSignature } from 'wallet-util'
import TxBuild from './tx-builder' 

import axios from 'axios'
import config from '../config'
import { InputModel, Transaction, UTXOModel, UTXOCollection } from '../transaction'

import AuthContract from './auth-contract'
import Fees from './fees'
import Costs from './costs'
import Keys from './keys'
import { RewardSummaryCollection } from '../transaction/reward-summary'
import {RewardPutCollection} from './puts/rewards'
import { UnserializedPutList } from './puts'

import Info from './info'
import { BURNING_RATIO } from '../constant'
import { Constitution, ScriptEngine } from 'wallet-script'
import { ContentLinkModel } from '../transaction/content-link'
import { CCHModel } from './cch'

import { MemoryModel } from './memory'

export interface IHeaderSignature {
    pubkey: string
    signature: string
}

export class Wallet extends Model {

    constructor(initialState: any, options: any){
        super(initialState, options)
        this.setState({
            seed: new Keys(initialState.seed, this.kids()),
            utxos: new UTXOCollection(initialState.utxos || [], this.kids()),
            puts: new UnserializedPutList(initialState.puts || [], this.kids()), 
            cch: new CCHModel(initialState.cch, this.kids()),
            contract: new AuthContract(initialState.contract, this.kids()),
            fees: new Fees(initialState.fees, this.kids()),
            info: new Info(initialState.info, this.kids()),
            costs: new Costs(initialState.costs, this.kids()),
            memory: new MemoryModel(initialState.memory, this.kids()),
            reward_summary: new RewardSummaryCollection(initialState.reward_summary, this.kids()),
            my_rewards: new RewardPutCollection(initialState.my_rewards, this.kids())
        })
    }

    synchronize = async () => {
        await this.auth().refresh()
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
            
            this.info().setState(json.info)
            this.cch().assignJSONResponse(json.cch)
            this.auth().setState(json.contract)
            this.fees().setState(json.fees)
            this.utxos().get().setState(json.utxos || [])
            this.costs().setState(json.costs)
            this.myRewards().assignJSONResponse(json.last_rewards) == 20 ? this.myRewards().cleanUpStorage() : null
            this.action().store()
            await this.keys().fetch().aliasIfNotSet()
            await this.refreshPutList()
            await this.refreshRewardColletion()
        }
    }

    refreshRewardColletion = async () => {
        await this.rewardSummary().fetch(this.rewardSummary().get().getLastReactionTime(), this.keys().get().pubHashHex())
    }

    refreshPutList = async () => {
        const CONFIG_LUGH_INTERVAL = 10
        const lastPutFetchHeight = this.memory().get().lastPutFetchHeight()
        const currentHeight = this.cch().get().lastHeight()

        const status = await this.puts().fetch().all(lastPutFetchHeight + CONFIG_LUGH_INTERVAL, this.sign().header())
        if (status == 200){
            this.memory().setLastPutFetchHeight(Math.min(currentHeight, lastPutFetchHeight + CONFIG_LUGH_INTERVAL)).store()
            if (this.memory().get().lastPutFetchHeight() < currentHeight){
                await this.refreshPutList()
            }
        }
    }

    public keys = (): Keys => this.state.seed
    public auth = (): AuthContract => this.state.contract
    public fees = (): Fees => this.state.fees
    public costs = (): Costs => this.state.costs
    public info = (): Info => this.state.info
    public puts = (): UnserializedPutList => this.state.puts
    public balance = (): number => this.utxos().get().get().totalMeltedValue(this.cch().get().list()) 
    public memory = (): MemoryModel => this.state.memory
    public cch = (): CCHModel => this.state.cch
    public rewardSummary = (): RewardSummaryCollection => this.state.reward_summary
    public myRewards = (): RewardPutCollection => this.state.my_rewards

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

        const toAddress = async (address: string, amount: number): Promise<Transaction | null> => {
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

        const rethread = async (content: ContentLinkModel) => {
            await this.synchronize()
            const contentNonce = this.info().get().contentNonce() + 1
            const contentPKH = this.keys().get().derivedPubHash(contentNonce)
            const targetPKH = content.get().link().get().output().get().contentPKH()

            const script = new ScriptEngine([]).append().rethreadScript(contentNonce, contentPKH, targetPKH)

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [this.costs().get().thread()],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const reward = async (content: ContentLinkModel, rewardType: 'upvote' | 'reaction0' | 'reaction1' | 'reaction2') => {
            await this.synchronize()
            const targetPKH = content.get().link().get().output().get().contentPKH()
    
            const scriptReward = new ScriptEngine([]).append().rewardScript(targetPKH, 1)
            const scriptDistribution = new ScriptEngine([]).append().lockScript(Buffer.from(content.get().pubKHAuthor(), 'hex'))
            
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

        const vote = async (proposal: ContentLinkModel, accept: boolean) => {
            await this.synchronize()
            const targetPKH = proposal.get().link().get().output().get().contentPKH()

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
            await this.auth().refresh()
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

        const transaction = async (tx: Transaction) => {
            
            const UTXOs = new UTXOCollection([], undefined)
            tx.get().inputs().forEach((i: InputModel) => {
                const exist = this.utxos().get().get().UTXOByTxHashAndVout(i.get().prevTxHash(), i.get().vout())
                exist && UTXOs.push(exist)
            })
            await UTXOs.fetchPrevTxList(this.sign().header())

            const inputs = tx.get().inputs()

            for (let i = 0; i < inputs.count(); i++){
                const prevTx = (UTXOs.nodeAt(i) as UTXOModel).get().tx() as Transaction
                const input = inputs.nodeAt(i) as InputModel
                
                let signature: Buffer = Buffer.from([])
                let pubkey: Buffer = Buffer.from([])

                const exist = this.utxos().get().get().UTXOByTxHashAndVout(input.get().prevTxHash(), input.get().vout())
                if (exist){
                    signature = Buffer.from(this.sign().value(prevTx.get().hash()))
                    pubkey = this.keys().get().pub()
                }

                input.setState({ script_sig: new ScriptEngine([]).append().unlockScript(signature, pubkey ).base64()  })
            }

            return true
        }
        
        return {
            value,
            transaction,
            header: (): IHeaderSignature => {
                return {
                    pubkey: this.keys().get().pubHex(),
                    signature: Buffer.from(value(Sha256(B64ToByteArray(this.auth().get().value())))).toString('hex')
                }
            }
        }
    }

}

