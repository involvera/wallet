import {config  } from 'acey'
import LocalStorage from 'acey-node-store'
import Wallet from './src/wallet/wallet'

const main = async () => {
    config.setStoreEngine(new LocalStorage('./db'))
    await config.done()

    const w = new Wallet("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou")
}

main()
