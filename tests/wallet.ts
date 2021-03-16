import { expect } from 'chai';
import 'mocha';
import {config  } from 'acey'
import LocalStorage from 'acey-node-store'

import { MAX_SUPPLY_AMOUNT } from '../src/constant';
import { IsAddressValid, PubKeyHashFromAddress } from '../src/util';

import Wallet from '../src/wallet/wallet'

const wallet = new Wallet({}, { key: 'wallet', connected: true })
const wallet2 = new Wallet({}, {key: 'wallet2', connected: true })

const initWallets = () => {
    wallet2.keys().set("social brief stool panel scene whale pledge tribe domain proof essence clog", "coucou").store()
    wallet.keys().set("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou").store()
}

const main = () => {
    it('initialisation', async () => {
        config.setStoreEngine(new LocalStorage('./db'))
        await config.done()
        initWallets()
    })

    it('refresh wallets', async () => {
        await wallet.refreshWalletData()
        await wallet2.refreshWalletData()
    })

    it('Wallet1 -> UTXOS: ', () => {
        const CCHList = wallet.cch().get().list()
        const utxos = wallet.utxos().get().get()

        expect(utxos.totalMeltedValue(CCHList)).to.equal(11442131552328)
        expect(wallet.balance()).to.equal(11442131552328)
        expect(utxos.totalValue()).to.equal(BigInt(11463370988354))
        const list = utxos.requiredList(Number(MAX_SUPPLY_AMOUNT), CCHList)
        expect(list.count()).to.equal(7)
        expect(utxos.listUnFetchedTxHash().length).to.eq(7)
    });

    it('Wallet1 -> Address: ', () => {
        expect(wallet.keys().get().address()).to.eq("1M4qfoZesnD8N7gTeYy7R2mfAdRJJxQJrM")
        expect(Buffer.compare(PubKeyHashFromAddress(wallet.keys().get().address()), wallet.keys().get().pubHash())).to.eq(0)
        expect(IsAddressValid(wallet.keys().get().address())).to.eq(true)
    })

    it('Wallet1 sends some coins to Wallet2 ', async () => {
        const total = Math.floor(wallet.balance() / 10)
        const tx = await wallet.buildTX().toAddress(wallet2.keys().get().address(), total)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            await wallet2.refreshWalletData()
            expect(wallet2.balance()).to.eq(total)
        }
    })







}

main()

/*
describe('Testing wallets methods', () => {

    it('UTXOS: ', () => {
        const CCHList = wallet.cch().get().list()
        const utxos = wallet.utxos().get().get()

        expect(utxos.totalMeltedValue(CCHList)).to.equal(11442131552328)
        expect(utxos.totalValue()).to.equal(BigInt(11463370988354))
        const list = utxos.requiredList(Number(MAX_SUPPLY_AMOUNT), CCHList)
        expect(list.count()).to.equal(7)
        expect(utxos.listUnFetchedTxHash().length).to.eq(7)
    });


    it('Address: ', () => {
        const w = new Wallet({}, {})
        w.keys().set("solution benefit width ankle joy diamond kitchen account portion deer eye acid", "coucou")
        expect(w.keys().get().address()).to.eq("1G7EDQGMMuRaSsXysJTNTJd6N6i24Mm1cT")
        expect(Buffer.compare(PubKeyHashFromAddress(w.keys().get().address()), w.keys().get().pubHash())).to.eq(0)
        expect(IsAddressValid(w.keys().get().address())).to.eq(true)
    }) 
})

*/