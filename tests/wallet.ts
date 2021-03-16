import { expect } from 'chai';
import 'mocha';
import {config  } from 'acey'
import LocalStorage from 'acey-node-store'

import { COIN_UNIT, MAX_SUPPLY_AMOUNT } from '../src/constant';
import { IsAddressValid, PubKeyHashFromAddress } from '../src/util';

import Wallet from '../src/wallet/wallet'
import { NewConstitution } from '../src/script/constitution';
import { ContentLink, Output } from '../src/transaction';

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

    it('Wallet1 -> create a proposal : application', async () => {
        const tx = await wallet.buildTX().proposal().application()
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
        }
    })

    it('Wallet1 -> create a proposal : constitution', async () => {
        const c = NewConstitution()
        c[0].title = "Title #0"
        c[0].content = "Content #0"

        const tx = await wallet.buildTX().proposal().constitution(c)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
        }
    })

    it('Wallet1 -> create a proposal : costs', async () => {
        const tx = await wallet.buildTX().proposal().cost(-1, COIN_UNIT * 2000)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
        }
    })

    let pkhContent = ""
    it('Wallet1 -> create a proposal', async () => {
        const tx = await wallet.buildTX().proposal().cost(-1, COIN_UNIT * 2000)
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            pkhContent = out.get().pubKHContent()
            expect(response.status).to.eq(201)
        }
    })

    it('Wallet1 -> create a vote', async () => {
        const proposal = await ContentLink.FetchProposal(pkhContent)
        const tx = await wallet.buildTX().vote(proposal, true)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
        }
    })

    it('Wallet1 -> create a thread', async () => {
        const tx = await wallet.buildTX().thread()
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            pkhContent = out.get().pubKHContent()
            expect(response.status).to.eq(201)
        }
    })

    let pkhContent2 = ""
    it('Wallet1 -> create a rethread', async () => {
        const thread = await ContentLink.FetchThread(pkhContent)
        const tx = await wallet.buildTX().rethread(thread)
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            pkhContent2 = out.get().pubKHContent()
            expect(response.status).to.eq(201)
        }
    })

    it('Wallet2 -> create a reward : upvote', async () => {
        const thread = await ContentLink.FetchThread(pkhContent)
        const tx = await wallet2.buildTX().reward(thread, 'upvote')
        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
        }
    })

    it('Wallet2 -> create a reward : upvote', async () => {
        const thread = await ContentLink.FetchThread(pkhContent2)
        const tx = await wallet2.buildTX().reward(thread, 'reaction0')
        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
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