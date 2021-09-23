import { Model } from 'acey'
import { Wallet } from '.'
import axios from 'axios'
import config from '../config'

export interface ICCH {
    list: string[]
    last_height: number    
}

export const DEFAULT_VALUE: ICCH = {
    list: [],
    last_height: 0
}

export class CCHModel extends Model {
    
    constructor(state: ICCH = DEFAULT_VALUE, options: any){
        super(Object.assign({}, state, {
            list: state.list.join(',')
        }), options)
    }

    fetch = async (wallet: Wallet) => {
        if (wallet.utxos().get().count() > 0){
            await wallet.auth().refresh()
            try {
                const res = await axios(config.getRootAPIChainUrl() + '/cch', {
                    headers: Object.assign({}, wallet.sign().header() as any, {last_cch: this.get().last() }),
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    },
                })
                res.status == 200 && this.assignJSONResponse(res.data).store()
                return res.status
            } catch (e: any){
                throw new Error(e)
            }
        }
    }

    assignJSONResponse = (json: any) => {
        let { list, last_height} = json
        list = list || []
        return this.setState({ 
            list: this.get().list().concat(list.filter((elem: string) => elem != '')) .join(','), 
            last_height
        })
    }

    get = () => {
        const list = (): string[] => !this.state.list ? [] : this.state.list.split(',')
        return {
            list,
            last: () => list().length == 0 ? '' : list()[0],
            lastHeight: (): number => this.state.last_height
        }
    } 
}
