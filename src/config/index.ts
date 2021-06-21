class Config { 
    private _rootAPIChain : string = 'http://localhost:8080'
    private _rootAPIContent: string = 'http://localhost:3020'
    
    constructor(){}
    setRootAPIChainUrl = (url: string) => this._rootAPIChain = url
    getRootAPIChainUrl = () => this._rootAPIChain

    setRootAPIContentUrl = (url: string) => this._rootAPIContent = url
    getRootAPIContentUrl = () => this._rootAPIContent
}

export default new Config()