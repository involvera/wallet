import { Model } from 'acey'
import { LastCostChangeModel } from './last-cost-change'
import { AliasCollection, AliasModel } from '../../alias'
import { Constant as Types, OFFCHAIN } from 'community-coin-types'
import { Inv } from 'wallet-util'

const DEFAULT_STATE: OFFCHAIN.ISocietyStats = {
    version: 0,
    total_contributor: 0,
    total_proposal: 0,
    last_height: 0,
    active_addresses: 0,
    most_active_addresses: [],
    circulating_supply:  '',
    circulating_vp_supply : '',
    last_thread_cost_change: LastCostChangeModel.DefaultState,
    last_proposal_cost_change: LastCostChangeModel.DefaultState
}

export class SocietyStatsModel extends Model {
    
    static DefaultState: OFFCHAIN.ISocietyStats = DEFAULT_STATE 
    
    constructor(state: OFFCHAIN.ISocietyStats = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            most_active_addresses: new AliasCollection(state.most_active_addresses, this.kids()),
            last_thread_cost_change: new LastCostChangeModel(state.last_thread_cost_change, this.kids()),
            last_proposal_cost_change: new LastCostChangeModel(state.last_proposal_cost_change, this.kids()),
        })
    }

    get = () => {
        return {
            version: (): Types.TByte => this.state.version,
            lastHeight: (): number => this.state.last_height,
            totalContributor: (): number => this.state.total_contributor,
            totalProposal: (): number => this.state.total_proposal,
            activeAddresses: (): number => this.state.active_addresses,
            mostActiveAddresses: (): AliasCollection => this.state.most_active_addresses,
            circulatingSupply: (): Inv.InvBigInt => new Inv.InvBigInt(this.state.circulating_supply), 
            circulatingVPSupply: (): Inv.InvBigInt => new Inv.InvBigInt(this.state.circulating_vp_supply),
            lastThreadCostChange: (): LastCostChangeModel => this.state.last_thread_cost_change,
            lastProposalCostChange: (): LastCostChangeModel => this.state.last_proposal_cost_change
        }
    }

    setAuthor = (author: AliasModel) => {
        this.get().mostActiveAddresses().forEach((a: AliasModel) => {
            a.copyMetaData(author)
        })
        return this.action()
    }
}