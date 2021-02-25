import {config  } from 'acey'
import LocalStorage from 'acey-node-store'

import WalletModel from './src/wallet/wallet'

const wallet = new WalletModel({}, { key: 'wallet', connected: true })
const wallet2 = new WalletModel({}, {key: 'wallet2', connected: true })

const initWallets = () => {
    wallet2.keys().set("social brief stool panel scene whale pledge tribe domain proof essence clog", "coucou").store()
    wallet.keys().set("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou").store()
}

const main = async () => {
    config.setStoreEngine(new LocalStorage('./db'))
    await config.done()
    initWallets()

    // await wallet.fetchAllWalletData()
    const tx = await wallet.buildTX().toPKH(wallet2.keys().get().pubHashHex(), 1000000)
    console.log(tx.to().string())

    // const kp = nacl.sign.keyPair.fromSeed(wallet.keys().get().seed())
    // console.log(kp.publicKey.length, kp.secretKey.length)
    // console.log(wallet.utxos().get().get().totalMeltedValue())
}

main()
