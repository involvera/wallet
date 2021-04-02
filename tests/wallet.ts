import { expect } from 'chai';
import 'mocha';
import {config} from 'acey'
import LocalStorage from 'acey-node-store'

import { COIN_UNIT, MAX_SUPPLY_AMOUNT } from '../src/constant';
import { DecodeBaseUUID, EncodeBaseUUID, IsAddressValid, PubKeyHashFromAddress, Sha256 } from '../src/util';
import Wallet from '../src/wallet/wallet'
import { NewConstitution } from '../src/script/constitution';
import { ContentLink, Output, UTXO } from '../src/transaction';
import { UnserializedPut } from '../src/wallet/puts';
import { HTML5_FMT } from 'moment';

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
        await wallet.synchronize()
        await wallet2.synchronize()
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
        expect(wallet.keys().get().mnemonic("coucou")).to.eq("film dirt damage apart carry horse enroll carry power prison flush bulb")
        const uuid = EncodeBaseUUID(wallet.keys().get().pubHash())
        expect(DecodeBaseUUID(uuid).toString('hex')).to.eq(wallet.keys().get().pubHashHex())
    })

    it('Wallet1 -> Puts: ', () => {
        expect(wallet.puts().count()).to.eq(10)
    })

    it('Wallet1 sends some coins to Wallet2 ', async () => {
        const total = Math.floor(wallet.balance() / 10)
        const balanceBefore = wallet.balance()
        const tx = await wallet.buildTX().toAddress(wallet2.keys().get().address(), total)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            await wallet2.synchronize()
            expect(wallet2.balance()).to.eq(total)
            expect(wallet.balance()).to.eq(balanceBefore-total-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(11)
            expect(wallet2.puts().count()).to.eq(1)

            const lastPut1 = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut1.get().valueAtCreationTime()).to.eq(total)
            expect(lastPut1.get().currentValue(wallet.cch().get().list())).to.eq(total)
            expect(lastPut1.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut1.get().recipientPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut1.get().txID()).to.eq(tx.get().hashHex())
            
            const lastPut2 = wallet2.puts().first() as UnserializedPut
            expect(lastPut2.get().valueAtCreationTime()).to.eq(total)
            expect(lastPut2.get().currentValue(wallet2.cch().get().list())).to.eq(total)
            expect(lastPut2.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut2.get().recipientPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut2.get().txID()).to.eq(tx.get().hashHex())
        }
    })

    it('Wallet1 -> create a proposal : application', async () => {
        const balance = wallet.balance()
        const tx = await wallet.buildTX().proposal().application()
        
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(12)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(Number(lastPut.get().valueAtCreationTime())-1).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isApplicationProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    it('Wallet1 -> create a proposal : constitution', async () => {
        const balance = wallet.balance()
        const c = NewConstitution()
        c[0].title = "Title #0"
        c[0].content = "Content #0"

        const tx = await wallet.buildTX().proposal().constitution(c)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-2)
            expect(wallet.puts().count()).to.eq(13)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isConstitutionProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    let uuidContent = ""
    it('Wallet1 -> create a proposal : costs', async () => {
        const tx = await wallet.buildTX().proposal().cost(-1, COIN_UNIT * 2000)
        const balance = wallet.balance()
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            const out = tx.get().outputs().nodeAt(0) as Output
            uuidContent = out.get().contentUUID()
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(14)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isCostProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    it('Wallet1 -> create a vote', async () => {
        const proposal = await ContentLink.FetchProposal(uuidContent)
        const tx = await wallet.buildTX().vote(proposal, true)
        const balance = wallet.balance()
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(15)
            expect(wallet.balance()).to.eq(balance-1-tx.get().fees(wallet.fees().get().feePerByte())-2)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(1)
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isVote()).to.eq(true)
            expect(lastPut.isAcceptedVote()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(proposal.get().output().get().pubKHHexContent())
        }
    })

    it('Wallet1 -> create a thread', async () => {
        const tx = await wallet.buildTX().thread()
        const balance = wallet.balance()

        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            uuidContent = out.get().contentUUID()
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(16)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-2)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(false)
            expect(lastPut.get().contentUUID()).to.eq(uuidContent)
            expect(lastPut.get().contentPKHTargeted()).to.eq("")
        }
    })

    let pkhContent2 = ""
    it('Wallet1 -> create a rethread', async () => {
        const thread = await ContentLink.FetchThread(uuidContent)
        const tx = await wallet.buildTX().rethread(thread)
        const balance = wallet.balance()

        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            pkhContent2 = out.get().pubKHHexContent()
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(17)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq(pkhContent2)
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().pubKHHexContent())
        }
    })

    it('Wallet2 -> create a reward : upvote', async () => {
        const thread = await ContentLink.FetchThread(uuidContent)
        const tx = await wallet2.buildTX().reward(thread, 'upvote')        
        const balance = wallet2.balance()
        const balance2 = wallet.balance()
        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
            await wallet.synchronize()
            expect(wallet2.puts().count()).to.eq(2)
            expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().upvote()-tx.get().fees(wallet2.fees().get().feePerByte())-1)
            const lastPut = wallet2.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq((wallet2.costs().get().upvote() * 0.3)+1)
            expect(lastPut.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut.get().recipientPKH()).to.eq(thread.get().pubKHAuthor())
            expect(lastPut.isReward()).to.eq(true)
            expect(lastPut.isUpvote()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().pubKHHexContent())


            expect(balance2).to.eq(wallet.balance()-(wallet.costs().get().upvote() * 0.3)-1)
            expect(wallet.puts().count()).to.eq(18)
            const lastPut2 = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut2.get().valueAtCreationTime()).to.eq((wallet2.costs().get().upvote() * 0.3)+1)
            expect(lastPut2.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut2.get().recipientPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut2.isReward()).to.eq(true)
            expect(lastPut2.isUpvote()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().pubKHHexContent())
        }
    })

    it('Wallet2 -> create a reward : reaction0', async () => {
        const thread = await ContentLink.FetchThread(pkhContent2)
        const tx = await wallet2.buildTX().reward(thread, 'reaction0')
        const balance = wallet2.balance()
        const balance2 = wallet.balance()

        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
            await wallet.synchronize()
            expect(wallet2.puts().count()).to.eq(3)
            expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().reaction0()-tx.get().fees(wallet2.fees().get().feePerByte())-2)
            const lastPut = wallet2.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq((wallet2.costs().get().reaction0() * 0.3)+1)
            expect(lastPut.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut.get().recipientPKH()).to.eq(thread.get().pubKHAuthor())
            expect(lastPut.isReward()).to.eq(true)
            expect(lastPut.isReaction0()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().pubKHHexContent())

            expect(balance2).to.eq(wallet.balance()-(wallet.costs().get().reaction0() * 0.3)-1)
            expect(wallet.puts().count()).to.eq(19)
            const lastPut2 = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut2.get().valueAtCreationTime()).to.eq((wallet2.costs().get().reaction0() * 0.3)+1)
            expect(lastPut2.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut2.get().recipientPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut2.isReward()).to.eq(true)
            expect(lastPut2.isReaction0()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().pubKHHexContent())
        }
    })
}

main()