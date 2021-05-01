class Config { 
    private _rootAPIUrl: string = 'http://localhost:8080'
    
    constructor(){}
    setRootAPIUrl = (url: string) => this._rootAPIUrl = url
    getRootAPIUrl = () => this._rootAPIUrl
}

export default new Config()