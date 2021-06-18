import { Model } from 'acey'

import { B64ToByteArray, PubKeyHashFromAddress, Sha256 } from '../util'
import { ec as EC } from 'elliptic'
import TxBuild from './tx-builder' 

import axios from 'axios'
import config from '../config'
import { Input, Transaction, UTXO, UTXOList } from '../transaction'

import AuthContract from './auth-contract'
import Fees from './fees'
import Costs from './costs'
import Keys from './keys'
import { UnserializedPutList } from './puts'

import Info from './info'
import { BURNING_RATIO } from '../constant'
import { TConstitution } from '../scriptV2/constitution'
import { ContentLink } from '../transaction/content-link'
import { ScriptEngineV2 } from '../scriptV2'

const ec = new EC('secp256k1');

export interface IHeaderSignature {
    pubkey: string
    signature: string
}

export class Wallet extends Model {

    constructor(initialState: any, options: any){
        super(initialState, options)
        
        this.setState({
            seed: new Keys(initialState.seed, this.kids()),
            utxos: new UTXOList(initialState.utxos || [], this.kids()),
            puts: new UnserializedPutList(initialState.puts || [], this.kids()), 
            cch: initialState.cch || {list: [], last_height: 0},
            contract: new AuthContract(initialState.contract, this.kids()),
            fees: new Fees(initialState.fees, this.kids()),
            info: new Info(initialState.info, this.kids()),
            costs: new Costs(initialState.costs, this.kids()),
            memory: initialState.memory || {last_put_fetch_height: 0, is_recovered_wallet: false}
        })
    }

    synchronize = async () => {
        await this.auth().refresh()
        const response = await axios(config.getRootAPIUrl() + '/wallet', {
            headers: Object.assign(this.sign().header() as any, {
                last_cch: this.cch().get().last(),
            }),
            timeout: 10000,
        })
        if (response.status == 200){
            const json = response.data
            this.info().setState(json.info)
            this.cch()._assignJSONResponse(json.cch)
            this.auth().setState(json.contract)
            this.fees().setState(json.fees)
            this.utxos().get().setState(json.utxos || [])
            this.costs().setState(json.costs)
            this.action().store()
            await this.refreshPutList()
        }
    }

    refreshPutList = async () => {
        const CONFIG_LUGH_INTERVAL = 6
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

    buildTX = () => {

        const proposal = () => {

            const application = async () => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce() + 1
    
                const script = new ScriptEngineV2([]).append().applicationProposalScript(contentNonce, this.keys().get().derivedPubHash(contentNonce)) 

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

                const script = new ScriptEngineV2([]).append().costProposalScript(contentNonce, this.keys().get().derivedPubHash(contentNonce), threadCost, proposalCost)

                const builder = new TxBuild({ 
                    wallet: this,
                    amount_required: [this.costs().get().proposal()],
                    scripts: [script.bytes()]
                })
                return await builder.newTx()
            }

            const constitution = async (constitution: TConstitution) => {
                await this.synchronize()
                const contentNonce = this.info().get().contentNonce() + 1

                const script = new ScriptEngineV2([]).append().constitutionProposalScript(contentNonce, this.keys().get().derivedPubHash(contentNonce), constitution) 
                
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

            const script = new ScriptEngineV2([]).append().lockScript(PubKeyHashFromAddress(address))

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

            const script = new ScriptEngineV2([]).append().threadScript(contentNonce, this.keys().get().derivedPubHash(contentNonce))
            
            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [this.costs().get().thread()],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const rethread = async (content: ContentLink) => {
            await this.synchronize()
            const contentNonce = this.info().get().contentNonce() + 1
            const contentPKH = this.keys().get().derivedPubHash(contentNonce)
            const targetPKH = content.get().output().get().contentPKH()

            const script = new ScriptEngineV2([]).append().rethreadScript(contentNonce, contentPKH, targetPKH)

            const builder = new TxBuild({ 
                wallet: this,
                amount_required: [this.costs().get().thread()],
                scripts: [script.bytes()]
            })

            return await builder.newTx()
        }

        const reward = async (content: ContentLink, rewardType: 'upvote' | 'reaction0' | 'reaction1' | 'reaction2') => {
            await this.synchronize()
            const targetPKH = content.get().output().get().contentPKH()
    
            const scriptReward = new ScriptEngineV2([]).append().rewardScript(targetPKH, 1)
            const scriptDistribution = new ScriptEngineV2([]).append().lockScript(Buffer.from(content.get().pubKHAuthor(), 'hex'))
            
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

        const vote = async (proposal: ContentLink, accept: boolean) => {
            await this.synchronize()
            const targetPKH = proposal.get().output().get().contentPKH()

            const script = new ScriptEngineV2([]).append().voteScript(targetPKH, accept)

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

    memory = () => {
        const get = () => {
            return {
                memory: () => this.state.memory,
                lastPutFetchHeight: () => this.state.memory.last_put_fetch_height
            }
        }

        const set = (o: any) => this.setState({ memory: Object.assign({}, get().memory(), o) })
        const setRecovered = () => set({ is_recovered_wallet: true }).store()

        const setLastPutFetchHeight = (last_put_fetch_height: number) => set({ last_put_fetch_height })

        return { get, set, setLastPutFetchHeight, setRecovered }
    }

    cch = () => {
        const get = () => {
            const list = (): string[] => this.state.cch.list 
            const last = () => list().length == 0 ? '' : list()[0]
            const lastHeight = (): number => this.state.cch.last_height
            return { list, last, lastHeight }
        }

        const _assignJSONResponse = (json: any) => {
            let { list, last_height} = json
            list = list || []
            return this.setState({ cch: { list: get().list().concat(list.filter((elem: any) => !!elem)), last_height } } )
        }

        const fetch = async () => {
            if (this.utxos().get().count() > 0){
                await this.auth().refresh()
                try {
                    const res = await axios(config.getRootAPIUrl() + '/cch', {
                        headers: Object.assign({}, this.sign().header() as any, {last_cch: get().last() }),
                        timeout: 10000,
                    })
                    res.status == 200 && _assignJSONResponse(res.data).store()
                    return res.status
                } catch (e){
                    throw new Error(e)
                }
            }
        }
        return { get, fetch, _assignJSONResponse }
    }

    utxos = () => {
        const get = (): UTXOList => this.state.utxos
        const fetch = async () => {
            await this.auth().refresh()
            try {
                const res = await axios(config.getRootAPIUrl() + '/utxos', {
                    method: 'GET',
                    headers: this.sign().header(),
                    timeout: 10000,
                })
                if (res.status == 200){
                    const json = res.data
                    get().setState(json.utxos || []).store()
                }
                return res.status
            } catch (e){
                throw new Error(e)
            }
        }
        return { get, fetch }
    }

    sign = () => {
        const value = (val: Buffer) => ec.sign(val, this.keys().get().priv()).toDER()
        const valueWithContentNonce = (contentNonce: number, val: Buffer) => ec.sign(val, this.keys().get().derivedPrivate(contentNonce)).toDER()

        const transaction = async (tx: Transaction) => {
            
            const UTXOs = new UTXOList([], undefined)
            tx.get().inputs().forEach((i: Input) => {
                const exist = this.utxos().get().get().UTXOByTxHashAndVout(i.get().prevTxHash(), i.get().vout())
                exist && UTXOs.push(exist)
            })
            await UTXOs.fetchPrevTxList(this.sign().header())

            const inputs = tx.get().inputs()

            for (let i = 0; i < inputs.count(); i++){
                const prevTx = (UTXOs.nodeAt(i) as UTXO).get().tx() as Transaction
                const input = inputs.nodeAt(i) as Input
                
                let signature: Buffer = Buffer.from([])
                let pubkey: Buffer = Buffer.from([])

                const exist = this.utxos().get().get().UTXOByTxHashAndVout(input.get().prevTxHash(), input.get().vout())
                if (exist){
                    signature = Buffer.from(this.sign().value(prevTx.get().hash()))
                    pubkey = this.keys().get().pub()
                }

                input.setState({ script_sig: new ScriptEngineV2([]).append().unlockScript(signature, pubkey ).base64()  })
            }

            return true
        }
        
        return {
            value,
            valueWithContentNonce,
            transaction,
            header: (): IHeaderSignature => {
                return {
                    pubkey: this.keys().get().pubHex() as string,
                    signature: Buffer.from(value(Sha256(B64ToByteArray(this.auth().get().value())))).toString('hex')
                }
            }
        }
    }

}

