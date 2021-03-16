import { Model } from 'acey'

import { B64ToByteArray, PubKeyHashFromAddress, Sha256 } from '../util'
import { ec as EC } from 'elliptic'
import TxBuild from './tx-builder' 

import fetch from 'node-fetch'
import { ROOT_API_URL } from '../constant/api'
import { Transaction, UTXOList } from '../transaction'

import AuthContract from './auth-contract'
import Fees from './fees'
import Costs from './costs'
import Keys from './keys'
import { EMPTY_CODE } from '../script/constant'
import Info from './info'
import { NewApplicationProposalScript, NewConstitutionProposalScript, NewCostProposalScript, NewProposalVoteScript, NewReThreadScript, NewRewardScript, NewThreadScript } from '../script/scripts'
import { BURNING_RATIO, PUBKEY_H_BURNER } from '../constant'
import { TConstitution } from '../script/constitution'
import { ContentLink } from '../transaction/content-link'

const ec = new EC('secp256k1');

export interface IHeaderSignature {
    pubkey: string
    signature: string
}

export default class Wallet extends Model {

    constructor(initialState: any, options: any){
        super(initialState, options)
        this.setState({ 
            seed: new Keys(initialState.seed || {seed: ''}, this.kids()),
            utxos: new UTXOList(initialState.utxos || [], this.kids()),
            cch: initialState.cch || {list: [], last_height: 0},
            contract: new AuthContract(initialState.contract, this.kids()),
            fees: new Fees(initialState.fees, this.kids()),
            info: new Info(initialState.info, this.kids()),
            costs: new Costs(initialState.costs, this.kids())
        })
    }

    refreshWalletData = async () => {
        await this.auth().refresh()
        const response = await fetch(ROOT_API_URL + '/wallet', {
            method: 'GET',
            headers: Object.assign(this.sign().header() as any, {
                last_cch: this.cch().get().last() 
            })
        })
        if (response.status == 200){
            const json = await response.json()
            this.info().setState(json.info).store()
            this.cch()._assignJSONResponse(json.cch)
            this.auth().setState(json.contract).store()
            this.fees().setState(json.fees).store()
            this.utxos().get().setState(json.utxos || []).store()
            this.costs().setState(json.costs).store()
        }
    }

    public keys = (): Keys => this.state.seed
    public auth = (): AuthContract => this.state.contract
    public fees = (): Fees => this.state.fees
    public costs = (): Costs => this.state.costs
    public info = (): Info => this.state.info

    public balance = (): number => this.utxos().get().get().totalMeltedValue(this.cch().get().list()) 

    buildTX = () => {

        const proposal = () => {

            const application = async () => {
                await this.refreshWalletData()
                const childIdx = this.info().get().countTotalContent() + 1
                const script = NewApplicationProposalScript(childIdx, this.keys().get().derivedPubHash(childIdx)) 
    
                const to: string[] = []
                const ta: Buffer[][] = []
                to.push(PUBKEY_H_BURNER)
                ta.push(script.targetScript())
    
                const builder = new TxBuild({ 
                    wallet: this,
                    to,
                    amount_required: [this.costs().get().proposal()],
                    ta,
                    kinds: Buffer.from([script.kind()])
                })
                return await builder.newTx()
            }

            const cost = async (threadCost: number, proposalCost: number) => {
                await this.refreshWalletData()
                const childIdx = this.info().get().countTotalContent() + 1
                const script = NewCostProposalScript(childIdx, this.keys().get().derivedPubHash(childIdx), threadCost, proposalCost) 

                const to: string[] = []
                const ta: Buffer[][] = []
                to.push(PUBKEY_H_BURNER)
                ta.push(script.targetScript())

                const builder = new TxBuild({ 
                    wallet: this,
                    to,
                    amount_required: [this.costs().get().proposal()],
                    ta,
                    kinds: Buffer.from([script.kind()])
                })
                return await builder.newTx()
            }

            const constitution = async (constitution: TConstitution) => {
                await this.refreshWalletData()
                const childIdx = this.info().get().countTotalContent() + 1
                const script = NewConstitutionProposalScript(childIdx, this.keys().get().derivedPubHash(childIdx), constitution) 
                
                const to: string[] = []
                const ta: Buffer[][] = []
                to.push(PUBKEY_H_BURNER)
                ta.push(script.targetScript())

                const builder = new TxBuild({ 
                    wallet: this,
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
            await this.refreshWalletData()

            const to: string[] = []
            const ta: Buffer[][] = []
            const emptyTa: Buffer[] = []

            to.push(PubKeyHashFromAddress(address).toString('hex'))
            ta.push(emptyTa)

            const builder = new TxBuild({ 
                wallet: this,
                to,
                amount_required: [amount],
                ta,
                kinds: Buffer.from([EMPTY_CODE])
            })

            return await builder.newTx()
        }

        const thread = async () => {
            await this.refreshWalletData()
            const childIdx = this.info().get().countTotalContent() + 1
            const script = NewThreadScript(childIdx, this.keys().get().derivedPubHash(childIdx)) 
            
            const to: string[] = []
            const ta: Buffer[][] = []
            to.push(PUBKEY_H_BURNER)
            ta.push(script.targetScript())

            const builder = new TxBuild({ 
                wallet: this,
                to,
                amount_required: [this.costs().get().thread()],
                ta,
                kinds: Buffer.from([script.kind()])
            })

            return await builder.newTx()
        }

        const rethread = async (content: ContentLink) => {
            await this.refreshWalletData()
            const childIdx = this.info().get().countTotalContent() + 1
            const contentRaw = content.toRaw()

            const script = NewReThreadScript(contentRaw.link.tx_id, contentRaw.link.vout, childIdx, this.keys().get().derivedPubHash(childIdx))

            const to: string[] = []
            const ta: Buffer[][] = []
            to.push(PUBKEY_H_BURNER)
            ta.push(script.targetScript())

            const builder = new TxBuild({ 
                wallet: this,
                to,
                amount_required: [this.costs().get().thread()],
                ta,
                kinds: Buffer.from([script.kind()])
            })

            return await builder.newTx()
        }

        const reward = async (content: ContentLink, rewardType: 'upvote' | 'reaction0' | 'reaction1' | 'reaction2') => {
            await this.refreshWalletData()
            const contentRaw = content.toRaw()
            const script = NewRewardScript(contentRaw.link.tx_id, contentRaw.link.vout, 1)

            const cost = this.costs().get()[rewardType]()
            const burned = Math.floor(BURNING_RATIO * cost)
            const distributed = cost - burned


            const builder = new TxBuild({ 
                wallet: this,
                to: [PUBKEY_H_BURNER, content.get().pubKHOrigin()],
                amount_required: [burned, distributed],
                kinds: Buffer.from([script.kind(), EMPTY_CODE]),
                ta: [script.targetScript(), []]
            })

            return await builder.newTx()
        }

        const vote = async (proposal: ContentLink, accept: boolean) => {
            await this.refreshWalletData()
            const proposalRaw = proposal.toRaw()
            const script = NewProposalVoteScript(proposalRaw.link.tx_id, proposalRaw.link.vout, accept)

            const builder = new TxBuild({ 
                wallet: this,
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
            this.setState({ cch: { list: get().list().concat(list.filter((elem: any) => !!elem)), last_height } } ).store()
        }

        const Fetch = async () => {
            if (this.utxos().get().count() > 0){
                await this.auth().refresh()
                try {
                    const res = await fetch(ROOT_API_URL + '/cch', {
                        method: 'GET',
                        headers: Object.assign({}, this.sign().header() as any, {last_cch: get().last() })
                    })
                    res.status == 200 && _assignJSONResponse(await res.json())
                    return res.status
                } catch (e){
                    throw new Error(e)
                }
            }
        }
        return { get, fetch: Fetch, _assignJSONResponse }
    }

    utxos = () => {
        const get = (): UTXOList => this.state.utxos
        const Fetch = async () => {
            await this.auth().refresh()
            try {
                const res = await fetch(ROOT_API_URL + '/utxos', {
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
        return { get, fetch: Fetch }
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

