import {config  } from 'acey'
import LocalStorage from 'acey-node-store'
import { wallet, wallet2 } from './src/models'


const initWallets = () => {
    wallet2.keys().set("social brief stool panel scene whale pledge tribe domain proof essence clog", "coucou")
    wallet.keys().set("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou")
}

const main = async () => {
    config.setStoreEngine(new LocalStorage('./db'))
    await config.done()
    initWallets()

    // await wallet.fetchAllWalletData()
    const tx = await wallet.buildTX().toPKH(wallet2.keys().get().pubHash(), 1000000)
    console.log(tx.to().string())

    // const kp = nacl.sign.keyPair.fromSeed(wallet.keys().get().seed())
    // console.log(kp.publicKey.length, kp.secretKey.length)
    // console.log(wallet.utxos().get().get().totalMeltedValue())
}

main()
