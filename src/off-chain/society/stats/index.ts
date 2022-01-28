import { Model } from 'acey'
import { DEFAULT_STATE as DEFAULT_LAST_COST_CHANGE_STATE, LastCostChangeModel } from './last-cost-change'
import { IAlias, AliasCollection } from '../../alias'
import { CostHistory } from 'community-coin-types'

export interface ISocietyStats {
    last_height: number
    total_contributor: number
    total_proposal: number
    active_addresses: number
    most_active_addresses: IAlias[]
    circulating_supply: string
    circulating_vp_supply: string
    last_thread_cost_change: CostHistory
    last_proposal_cost_change: CostHistory
}

export const DEFAULT_STATE: ISocietyStats  = {
    total_contributor: 0,
    total_proposal: 0,
    last_height: 0,
    active_addresses: 0,
    most_active_addresses: [] as IAlias[],
    circulating_supply:  '',
    circulating_vp_supply : '',
    last_thread_cost_change: DEFAULT_LAST_COST_CHANGE_STATE,
    last_proposal_cost_change: DEFAULT_LAST_COST_CHANGE_STATE
}

export class SocietyStatsModel extends Model {
    
    static DefaultState: ISocietyStats = DEFAULT_STATE 
    
    constructor(state: ISocietyStats = DEFAULT_STATE, options: any){
        super(state, options)
        this.setState({
            most_active_addresses: new AliasCollection(state.most_active_addresses, this.kids()),
            last_thread_cost_change: new LastCostChangeModel(state.last_thread_cost_change, this.kids()),
            last_proposal_cost_change: new LastCostChangeModel(state.last_proposal_cost_change, this.kids()),
        })
    }

    get = () => {
        return {
            lastHeight: (): number => this.state.last_height,
            totalContributor: (): number => this.state.total_contributor,
            totalProposal: (): number => this.state.total_proposal,
            activeAddresses: (): number => this.state.active_addresses,
            mostActiveAddresses: (): AliasCollection => this.state.most_active_addresses,
            circulatingSupply: (): string => this.state.circulating_supply, 
            circulatingVPSupply: (): string => this.state.circulating_vp_supply,
            lastThreadCostChange: (): LastCostChangeModel => this.state.last_thread_cost_change,
            lastProposalCostChange: (): LastCostChangeModel => this.state.last_proposal_cost_change
        }
    }
}