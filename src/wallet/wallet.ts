import { Model } from 'acey'

import { B64ToByteArray, PubKeyHashFromAddress, Sha256 } from '../util'
import { ec as EC } from 'elliptic'
import TxBuild from './tx-builder' 

import { Fetch } from '../constant'
import { ROOT_API_URL } from '../constant/api'
import { Transaction, UTXOList } from '../transaction'

import AuthContract from './auth-contract'
import Fees from './fees'
import Costs from './costs'
import Keys from './keys'
import { UnserializedPutList } from './puts'

import { EMPTY_CODE } from '../script/constant'
import Info from './info'
import { NewApplicationProposalScript, NewConstitutionProposalScript, NewCostProposalScript, NewProposalVoteScript, NewReThreadScript, NewRewardScript, NewThreadScript } from '../script/scripts'
import { BURNING_RATIO, PUBKEY_H_BURNER } from '../constant'
import { TConstitution } from '../script/constitution'
import { ContentLink } from '../transaction/content-link'

import { config } from 'acey'
const ec = new EC('secp256k1');

export interface IHeaderSignature {
    pubkey: string
    signature: string
}

export class Wallet extends Model {

    static InitLocalStore = async () => {
        await config.done()
    }

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
        const response = await Fetch(ROOT_API_URL + '/wallet', {
            method: 'GET',
            headers: Object.assign(this.sign().header() as any, {
                last_cch: this.cch().get().last() 
            })
        })
        if (response.status == 200){
            const json = await response.json()
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
                const childIdx = this.info().get().countTotalContent() + 1
                const script = NewApplicationProposalScript(childIdx, this.keys().get().derivedPubHash(childIdx)) 
    
                const to: string[] = []
                const ta: Buffer[][] = []
                to.push(PUBKEY_H_BURNER)
                ta.push(script.targetScript())
    
                const builder = new TxBuild({ 
                    wallet: [this],
                    to,
                    amount_required: [this.costs().get().proposal()],
                    ta,
                    kinds: Buffer.from([script.kind()])
                })
                return await builder.newTx()
            }

            const cost = async (threadCost: number, proposalCost: number) => {
                await this.synchronize()
                const childIdx = this.info().get().countTotalContent() + 1
                const script = NewCostProposalScript(childIdx, this.keys().get().derivedPubHash(childIdx), threadCost, proposalCost) 

                const to: string[] = []
                const ta: Buffer[][] = []
                to.push(PUBKEY_H_BURNER)
                ta.push(script.targetScript())

                const builder = new TxBuild({ 
                    wallet: [this],
                    to,
                    amount_required: [this.costs().get().proposal()],
                    ta,
                    kinds: Buffer.from([script.kind()])
                })
                return await builder.newTx()
            }

            const constitution = async (constitution: TConstitution) => {
                await this.synchronize()
                const childIdx = this.info().get().countTotalContent() + 1
                const script = NewConstitutionProposalScript(childIdx, this.keys().get().derivedPubHash(childIdx), constitution) 
                
                const to: string[] = []
                const ta: Buffer[][] = []
                to.push(PUBKEY_H_BURNER)
                ta.push(script.targetScript())

                const builder = new TxBuild({ 
                    wallet: [this],
                    to,
                    amount_required: [this.costs().get().proposal()],
                    ta,
                    kinds: Buffer.from([script.kind()])
                })
                return await builder.newTx()
            }

            return { constitution, application, cost }
        }

        const toAddress = async (address: string, amount: number): Promise<Transaction | null> => {
            await this.synchronize()

            const to: string[] = []
            const ta: Buffer[][] = []
            const emptyTa: Buffer[] = []

            to.push(PubKeyHashFromAddress(address).toString('hex'))
            ta.push(emptyTa)

            const builder = new TxBuild({ 
                wallet: [this],
                to,
                amount_required: [amount],
                ta,
                kinds: Buffer.from([EMPTY_CODE])
            })

            return await builder.newTx()
        }

        const thread = async () => {
            await this.synchronize()
            const childIdx = this.info().get().countTotalContent() + 1
            const script = NewThreadScript(childIdx, this.keys().get().derivedPubHash(childIdx)) 
            
            const to: string[] = []
            const ta: Buffer[][] = []
            to.push(PUBKEY_H_BURNER)
            ta.push(script.targetScript())

            const builder = new TxBuild({ 
                wallet: [this],
                to,
                amount_required: [this.costs().get().thread()],
                ta,
                kinds: Buffer.from([script.kind()])
            })

            return await builder.newTx()
        }

        const rethread = async (content: ContentLink) => {
            await this.synchronize()
            const childIdx = this.info().get().countTotalContent() + 1
            const contentRaw = content.toRaw()

            const script = NewReThreadScript(contentRaw.link.tx_id, contentRaw.link.vout, childIdx, this.keys().get().derivedPubHash(childIdx))

            const to: string[] = []
            const ta: Buffer[][] = []
            to.push(PUBKEY_H_BURNER)
            ta.push(script.targetScript())

            const builder = new TxBuild({ 
                wallet: [this],
                to,
                amount_required: [this.costs().get().thread()],
                ta,
                kinds: Buffer.from([script.kind()])
            })

            return await builder.newTx()
        }

        const reward = async (content: ContentLink, rewardType: 'upvote' | 'reaction0' | 'reaction1' | 'reaction2') => {
            await this.synchronize()
            const contentRaw = content.toRaw()
            const script = NewRewardScript(contentRaw.link.tx_id, contentRaw.link.vout, 1)

            const cost = this.costs().get()[rewardType]()
            const burned = Math.floor(BURNING_RATIO * cost)
            const distributed = cost - burned


            const builder = new TxBuild({ 
                wallet: [this],
                to: [PUBKEY_H_BURNER, content.get().pubKHAuthor()],
                amount_required: [burned, distributed],
                kinds: Buffer.from([script.kind(), EMPTY_CODE]),
                ta: [script.targetScript(), []]
            })

            return await builder.newTx()
        }

        const vote = async (proposal: ContentLink, accept: boolean) => {
            await this.synchronize()
            const proposalRaw = proposal.toRaw()
            const script = NewProposalVoteScript(proposalRaw.link.tx_id, proposalRaw.link.vout, accept)

            const builder = new TxBuild({ 
                wallet: [this],
                to: [PUBKEY_H_BURNER],
                amount_required: [1],
                kinds: Buffer.from([script.kind()]),
                ta: [script.targetScript(), []]
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

        const f = async () => {
            if (this.utxos().get().count() > 0){
                await this.auth().refresh()
                try {
                    const res = await Fetch(ROOT_API_URL + '/cch', {
                        method: 'GET',
                        headers: Object.assign({}, this.sign().header() as any, {last_cch: get().last() })
                    })
                    res.status == 200 && _assignJSONResponse(await res.json()).store()
                    return res.status
                } catch (e){
                    throw new Error(e)
                }
            }
        }
        return { get, fetch: f, _assignJSONResponse }
    }

    utxos = () => {
        const get = (): UTXOList => this.state.utxos
        const f = async () => {
            await this.auth().refresh()
            try {
                const res = await Fetch(ROOT_API_URL + '/utxos', {
                    method: 'GET',
                    headers: this.sign().header() as any
                })
                if (res.status == 200){
                    const json = await res.json()
                    get().setState(json.utxos || []).store()
                }
                return res.status
            } catch (e){
                throw new Error(e)
            }
        }
        return { get, fetch: f }
    }

    sign = () => {
        const value = (val:Buffer) => ec.sign(val, this.keys().get().priv()).toDER()
        return {
            value,
            header: (): IHeaderSignature => {
                return {
                    pubkey: this.keys().get().pubHex() as string,
                    signature: Buffer.from(value(Sha256(B64ToByteArray(this.auth().get().value())))).toString('hex')
                }
            }
        }
    }

}

