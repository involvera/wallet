import { Model, Collection } from 'acey'
import { Constitution as C } from 'wallet-script'

export class RuleModel extends Model {

    constructor(state: C.IConstitutionRule, options:any){
        super(state, options)
    }

    get = () => {
        return{
            content: (): string => this.state.content,
            title: (): string => this.state.title
        }
    }
}

export class RuleCollection extends Collection {
    constructor(state: C.TConstitution, options:any){
        super(state, options)
    }
}


