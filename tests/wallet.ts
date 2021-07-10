import { expect } from 'chai';
import 'mocha';
import {config} from 'acey'
import LocalStorage from 'acey-node-store'

import { COIN_UNIT, LUGH_AMOUNT, MAX_SUPPLY_AMOUNT } from '../src/constant';
import { DecodeBaseUUID, EncodeBaseUUID, IsAddressValid, PubKeyHashFromAddress } from 'wallet-util';
import { Wallet } from '../src/wallet'
import { UnserializedPut } from '../src/wallet/puts';
import { Constitution } from 'wallet-script';
import { ContentLink, Output } from '../src/transaction';
import { Thread, Proposal, Reward, SocietyModel } from '../src/off-chain';
import axios from 'axios';
import conf from '../src/config'


const ADMIN_KEY = '2f72e55b962b6cd66ea70e8b6bd8657d1c87a23a65769213d76dcb5da6abf6b5'

const wallet = new Wallet({}, { key: 'wallet', connected: true })
const wallet2 = new Wallet({}, {key: 'wallet2', connected: true })
const wallet3 =  new Wallet({}, {key: 'wallet3', connected: true })

const initWallets = () => {
    wallet.keys().set("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou").store()
    wallet2.keys().set("social brief stool panel scene whale pledge tribe domain proof essence clog", "coucou").store()
    wallet3.keys().set("horse flush dirt carry scene whale pledge tribe domain proof essence mail", "coucou").store()
}

const main = () => {

    it('Fetch Society', async () => {
        const society = await SocietyModel.fetch(1)
        if (society){
            expect(society.get().stats().get().activeAddresses()).to.eq(58)
            expect(society.get().stats().get().circulatingVPSupply()).to.eq(BigInt(8 * LUGH_AMOUNT))
            expect(society.get().stats().get().mostActiveAddresses().count()).to.eq(1)
            expect(society.get().name()).to.eq("Involvera")
            expect(society.get().domain()).to.eq("involvera.com")
        }
    })

    it('OFFCHAIN reset', async () => {
        const res = await axios(`${conf.getRootAPIOffChainUrl()}/admin/1/reset`, {
            method: 'POST',
            headers: {
                admin_key: ADMIN_KEY
            }
        })
        expect(res.status).to.eq(200)
    })

    it('initialisation', async () => {
        config.setStoreEngine(new LocalStorage('./db'))
        await config.done()
        initWallets()
    })

    it('refresh wallets', async () => {
        await wallet.synchronize()
        await wallet2.synchronize()
    })

    it('[ONCHAIN] Wallet1 -> Fetch and check UTXOS: ', () => {
        const CCHList = wallet.cch().get().list()
        const utxos = wallet.utxos().get().get()

        expect(utxos.totalMeltedValue(CCHList)).to.equal(11442131552328)
        expect(wallet.balance()).to.equal(11442131552328)
        expect(utxos.totalValue()).to.equal(BigInt(11463370988354))
        const list = utxos.requiredList(Number(MAX_SUPPLY_AMOUNT), CCHList)
        expect(list.count()).to.equal(7)
        expect(utxos.listUnFetchedTxHash().length).to.eq(7)
    });

    it('Wallet1 -> Check Address: ', () => {
        expect(wallet.keys().get().address()).to.eq("1GHQu3CDZpPZGb6PmaBPP4sZNuT13sja1")
        expect(Buffer.compare(PubKeyHashFromAddress(wallet.keys().get().address()), wallet.keys().get().pubHash())).to.eq(0)
        expect(IsAddressValid(wallet.keys().get().address())).to.eq(true)
        expect(wallet.keys().get().mnemonic("coucou")).to.eq("film dirt damage apart carry horse enroll carry power prison flush bulb")
        const uuid = EncodeBaseUUID(wallet.keys().get().pubHash())
        expect(DecodeBaseUUID(uuid).toString('hex')).to.eq(wallet.keys().get().pubHashHex())
    })

    it('Wallet1 -> Check Constitution and Costs: ', () => {
        expect(wallet.costs().get().thread()).to.eq(LUGH_AMOUNT / 200)
        expect(wallet.costs().get().proposal()).to.eq(LUGH_AMOUNT / 20)
        expect(wallet.constitution().get().constitution().length).to.eq(10)
        const constitution = wallet.constitution().get().constitution()
        expect(constitution[0].title == 'Rule number 1')
        expect(constitution[0].content == 'Content of the rule number 1')
        expect(constitution[1].title == 'Rule number 2')
        expect(constitution[1].content == 'Content of the rule number 2')
        expect(constitution[2].title == 'No Rule 3')
        expect(constitution[2].content == 'There is no rule number 3')
    })

    it('[ONCHAIN] Wallet1 -> Fetch and check Puts: ', () => {
        expect(wallet.puts().count()).to.eq(10)
        expect(wallet.puts().get().totalVotePower()).to.eq(BigInt(11611604044790))
        expect(wallet.puts().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('0.145')
        const now = new Date()
        now.setTime(now.getTime() - (1000 * 86400 * 90))
        expect(wallet.puts().get().totalReceivedDonationSince(now, wallet.keys().get().pubHashHex())).to.eq(BigInt(1800000004))
    })

    it('[OFFCHAIN] Wallet1 -> create a thread failed 1/3', async () => {
        const p = Thread.NewContent(1, "", "Content of my thread")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce() + 1))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("Not Found")
    })

    it('[OFFCHAIN] Wallet1 -> create a thread failed 2/3', async () => {
        const p = Thread.NewContent(1, "", "Content of my thread")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("You need to create an alias on your address before adding content.")
    })

    it('[ONCHAIN] Wallet1 sends some coins to Wallet2 ', async () => {
        const total = Math.floor(wallet.balance() / 10)
        const balanceBefore = wallet.balance()
        const tx = await wallet.buildTX().toAddress(wallet2.keys().get().address(), total)
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            await wallet2.synchronize()
            expect(wallet2.balance()).to.eq(total)
            expect(wallet.balance()).to.eq(balanceBefore-total-tx.get().fees(wallet.fees().get().feePerByte())-2)
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

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 1/4', async () => {
        const p = Proposal.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("Not Found")
    })

    it('[ONCHAIN] Wallet1 -> create a proposal : application', async () => {
        const balance = wallet.balance()
        const tx = await wallet.buildTX().proposal().application()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(12)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(Number(lastPut.get().valueAtCreationTime())-2).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isApplicationProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 2/4', async () => {
        const p = Proposal.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 3/4', async () => {
        const p = Proposal.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("You need to create an alias on your address before adding content.")
    })

    it('[OFFCHAIN] Create an alias on Wallet 1', async () => {
        const alias = wallet.keys().get().alias()
        alias.setUsername('fantasim')
        const res = await alias.update(wallet.keys().get().wallet())
        expect(res.status).to.eq(201)
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal application content', async () => {
        const p = Proposal.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 4/4', async () => {
        const p = Proposal.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(401)
        expect(res.data.error).to.eq("Proposal is already recorded.")
    })

    it('[ONCHAIN] Wallet1 -> create a proposal : constitution', async () => {
        const balance = wallet.balance()
        const c = Constitution.NewConstitution()
        c[0].title = "Title #0"
        c[0].content = "Content #0"

        const tx = await wallet.buildTX().proposal().constitution(c)
        expect(tx).not.eq(null)
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

    it('[OFFCHAIN] Wallet1 -> create a proposal constitution failed 1/1', async () => {
        const p = Proposal.NewContent(1, "This is the title of a constitution proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal constitution content', async () => {
        const p = Proposal.NewContent(1, "This is the title of a constitution proposal", ["Content 1", "Content 2", "Content 3"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    let uuidContent = ""
    it('[ONCHAIN] Wallet1 -> create a proposal : costs', async () => {
        const tx = await wallet.buildTX().proposal().cost(BigInt(-1), BigInt(COIN_UNIT * 2000))
        const balance = wallet.balance()
        expect(tx).not.eq(null)
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

    it('[OFFCHAIN] Wallet1 -> create a proposal cost content failed 1/1', async () => {
        const p = Proposal.NewContent(1, "This is the title of a cost proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal cost content', async () => {
        const p = Proposal.NewContent(1, "This is the title of a cost proposal", ["Content 1", "Content 2", "Content 3"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet1 -> create a vote', async () => {
        const proposal = await ContentLink.FetchProposal(uuidContent)
        const tx = await wallet.buildTX().vote(proposal, true)
        const balance = wallet.balance()
        expect(tx).not.eq(null)
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
            expect(lastPut.get().contentPKHTargeted()).to.eq(proposal.get().output().get().contentPKH().toString('hex'))
        }
    })

    it('[ONCHAIN] Wallet1 -> create a thread', async () => {
        const tx = await wallet.buildTX().thread()
        const balance = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            uuidContent = out.get().contentUUID()
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(16)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(false)
            expect(lastPut.get().contentUUID()).to.eq(uuidContent)
            expect(lastPut.get().contentPKHTargeted()).to.eq("")
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a thread', async () => {
        const p = Thread.NewContent(1, "This is a title.", "Content of my thread")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    let pkhContent2 = ""
    it('[ONCHAIN] Wallet1 -> create a rethread', async () => {
        const thread = await ContentLink.FetchThread(uuidContent)
        const tx = await wallet.buildTX().rethread(thread)
        const balance = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as Output
            pkhContent2 = out.get().contentPKH().toString('hex')
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(17)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().senderPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq(pkhContent2)
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().contentPKH().toString('hex'))
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a rethread', async () => {
        const p = Thread.NewContent(1, "This is a title.", "Content of my thread")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[OFFCHAIN] Create an alias on Wallet 2', async () => {
        const alias = wallet2.keys().get().alias()
        alias.setUsername('skily')
        const res = await alias.update(wallet2.keys().get().wallet())
        expect(res.status).to.eq(201)
    })

    let lastReaction = {tx_id: '', vout: -1}
    it('[ONCHAIN] Wallet2 -> create a reward : upvote', async () => {
        const thread = await ContentLink.FetchThread(uuidContent)
        const tx = await wallet2.buildTX().reward(thread, 'upvote')        
        const balance = wallet2.balance()
        const balance2 = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
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
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().contentPKH().toString('hex'))


            expect(balance2).to.eq(wallet.balance()-(wallet.costs().get().upvote() * 0.3)-1)
            expect(wallet.puts().count()).to.eq(18)
            const lastPut2 = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut2.get().valueAtCreationTime()).to.eq((wallet2.costs().get().upvote() * 0.3)+1)
            expect(lastPut2.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut2.get().recipientPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut2.isReward()).to.eq(true)
            expect(lastPut2.isUpvote()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().contentPKH().toString('hex'))
        }
    })

    it('[OFFCHAIN] Wallet2 -> create a reward : upvote', async () => {
        const r = Reward.NewContent(1, lastReaction.tx_id, lastReaction.vout)
        const res = await r.broadcast()
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet2 -> create a reward : reaction0', async () => {
        const thread = await ContentLink.FetchThread(pkhContent2)
        const tx = await wallet2.buildTX().reward(thread, 'reaction0')
        const balance = wallet2.balance()
        const balance2 = wallet.balance()
        expect(tx).not.eq(null)

        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet.synchronize()
            expect(wallet2.puts().count()).to.eq(3)
            expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().reaction0()-tx.get().fees(wallet2.fees().get().feePerByte())-1)
            const lastPut = wallet2.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().valueAtCreationTime()).to.eq((wallet2.costs().get().reaction0() * 0.3)+1)
            expect(lastPut.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut.get().recipientPKH()).to.eq(thread.get().pubKHAuthor())
            expect(lastPut.isReward()).to.eq(true)
            expect(lastPut.isReaction0()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().contentPKH().toString('hex'))

            expect(balance2).to.eq(wallet.balance()-(wallet.costs().get().reaction0() * 0.3)-1)
            expect(wallet.puts().count()).to.eq(19)
            const lastPut2 = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut2.get().valueAtCreationTime()).to.eq((wallet2.costs().get().reaction0() * 0.3)+1)
            expect(lastPut2.get().senderPKH()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut2.get().recipientPKH()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut2.isReward()).to.eq(true)
            expect(lastPut2.isReaction0()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().output().get().contentPKH().toString('hex'))
        }
    })

    it('[OFFCHAIN] Wallet2 -> create a reward : reaction0', async () => {
        const r = Reward.NewContent(1, lastReaction.tx_id, lastReaction.vout)
        const res = await r.broadcast()
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet1 -> Check puts:', () => {
        expect(wallet.puts().count()).to.eq(19)
        expect(wallet.puts().get().totalVotePower()).to.eq(BigInt(11611604044790))
        expect(wallet.puts().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('0.145')
        const now = new Date()
        now.setTime(now.getTime() - (1000 * 86400 * 90))
        expect(wallet.puts().get().totalReceivedDonationSince(now, wallet.keys().get().pubHashHex())).to.eq(BigInt(4050000006))
    })

    it('[ONCHAIN] Wallet1 -> Check Vote power distribution on Puts.', () => {
        expect(wallet.puts().get().votePowerDistribution().count()).to.eq(3)
    })
}

main()