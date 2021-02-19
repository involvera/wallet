import {config  } from 'acey'
import LocalStorage from 'acey-node-store'
import { wallet } from './src/models'
import Wallet from './src/wallet/wallet'

const main = async () => {
    config.setStoreEngine(new LocalStorage('./db'))
    await config.done()

    // wallet.seed().set("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou")
    // await wallet.refreshAllData()
    // console.log(wallet.utxos().get().get().totalMeltedValue())
}

main()
