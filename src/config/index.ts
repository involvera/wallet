class Config { 
    private _rootAPIChain : string = 'http://localhost:8080'
    private _rootAPIOffChain: string = 'http://localhost:3020'
    
    constructor(){}
    setRootAPIChainUrl = (url: string) => this._rootAPIChain = url
    getRootAPIChainUrl = () => this._rootAPIChain

    setRootAPIOffChainUrl = (url: string) => this._rootAPIOffChain = url
    getRootAPIOffChainUrl = () => this._rootAPIOffChain
}

export default new Config()