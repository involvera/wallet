import { expect } from 'chai';
import 'mocha';
import {config} from 'acey'
import LocalStorage from 'acey-node-store'
import fs from 'fs'
import { Constitution, Script } from 'wallet-script';
import { Inv } from 'wallet-util'
import { COIN_UNIT, COUNT_DEFAULT_PROPOSALS, LUGH_AMOUNT, LUGH_EVERY_N_S, MAX_SUPPLY_AMOUNT, N_LUGH_VOTE_DURATION } from '../src/constant';
import { WalletModel } from '../src/wallet'
import { UnserializedPutCollection, UnserializedPutModel } from '../src/off-chain/puts';
import { OutputModel } from '../src/transaction';
import { ThreadModel, ProposalModel, SocietyModel, RuleModel, ThreadCollection, ProposalCollection, UserModel,UserCollection } from '../src/off-chain';
import axios from 'axios';
import conf from '../src/config'
import { IConstitutionProposalUnRaw, ICostProposal, REWARD0_KEY, REWARD2_KEY, REWARD1_KEY, UPVOTE_KEY } from 'community-coin-types'
import { UserVoteModel } from '../src/off-chain/proposal/user-vote';

const {
    InvBuffer
} = Inv

// conf.setRootAPIChainUrl('http://134.122.16.30:8080')
// conf.setRootAPIOffChainUrl('http://134.122.16.30:3020')

const ADMIN_KEY = '2f72e55b962b6cd66ea70e8b6bd8657d1c87a23a65769213d76dcb5da6abf6b5'
const SOCIETY_ID = 1

const wallet = new WalletModel({}, { key: 'wallet', connected: true })
const wallet2 = new WalletModel({}, {key: 'wallet2', connected: true })
const wallet3 =  new WalletModel({}, {key: 'wallet3', connected: true })

const walletPuts = new UnserializedPutCollection([], {connected: true, key: 'wallet_puts'})
const wallet2Puts = new UnserializedPutCollection([], {connected: true, key: 'wallet2_puts'})
const wallet3Puts = new UnserializedPutCollection([], {connected: true, key: 'wallet3_puts'})

const userList = new UserCollection([], {connected: true, key: 'users'})

const initWallets = async () => {
    const w = await wallet.keys().set("film dirt damage apart carry horse enroll carry power prison flush bulb", "coucou")
    w.store()
    const w2 = await wallet2.keys().set("social brief stool panel scene whale pledge tribe domain proof essence clog", "coucou")
    w2.store()
    const w3 = await wallet3.keys().set("toy elder edge wait antique approve carry prize acid believe human shine", "coucou")
    w3.store()
}

const main = () => {

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
        await initWallets()
        expect(wallet.keys().get().address().get()).to.eq(wallet.keys().get().alias().get().address().get())
    })

    it('refresh wallets', async () => {
        const s = await SocietyModel.fetch(1)
        expect(s).to.not.eq(null)
        if (s){
            walletPuts.setSociety(s)
            wallet2Puts.setSociety(s)
            wallet3Puts.setSociety(s)            
        }
        await wallet.synchronize()
        await wallet2.synchronize()
        await wallet3.synchronize()

        expect(wallet.keys().get().address().get()).to.eq(wallet.keys().get().alias().get().address().get())
        expect(wallet2.keys().get().address().get()).to.eq(wallet2.keys().get().alias().get().address().get())
        expect(wallet3.keys().get().address().get()).to.eq(wallet3.keys().get().alias().get().address().get())

        await walletPuts.fetch(wallet.sign().header(), true).all()
        await wallet2Puts.fetch(wallet2.sign().header(), true).all()
        await wallet3Puts.fetch(wallet3.sign().header(), true).all()
    })

    it('[ONCHAIN] Wallet1 -> Fetch and check UTXOS: ', () => {
        const CCHList = wallet.cch().get().list()
        const utxos = wallet.utxos().get().get()
        expect(utxos.totalMeltedValue(CCHList).big()).to.equal(13001154805507n)
        expect(wallet.balance().big()).to.equal(13001154805507n)
        expect(utxos.totalValue().big()).to.equal(BigInt(13022498650880n))
        const list = utxos.requiredList(MAX_SUPPLY_AMOUNT, CCHList)
        expect(list.count()).to.equal(7)
        expect(utxos.listUnFetchedTxHash().length).to.eq(7)
    });

    it('Wallet1 -> Check Address: ', () => {
        expect(wallet.keys().get().address().get()).to.eq("1DHA8m54a1Vi3oR6LkqkkKYRBR9ZhPjZvC")
        expect(wallet.keys().get().mnemonic().get()).to.eq("film dirt damage apart carry horse enroll carry power prison flush bulb")
    })

    it('Wallet1 -> Check Costs: ', () => {
        expect(wallet.costs().get().thread().big()).to.eq(LUGH_AMOUNT.div(200).big())
        expect(wallet.costs().get().proposal().big()).to.eq(LUGH_AMOUNT.div(20).big())
    })

    it('[ONCHAIN] Wallet1 -> Check Puts/Info: ', () => {
        expect(walletPuts.count()).to.eq(5)
        expect(wallet.info().get().votePowerCount().big()).to.eq(13170731707316n)
        expect(wallet.info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('16.463')
        expect(wallet.info().get().activity().get().lastLughHeight()).to.eq(7)
        const activity = wallet.info().get().activity().get().activity()
        expect(activity.length).to.eq(3) 
        expect(activity[0]).to.eq(0) 
        expect(activity[1]).to.eq(3) 
        expect(activity[2]).to.eq(0)
        expect(wallet.info().get().rewardsReceivedLast90D().big()).to.eq(1800000004n)
        expect(wallet.info().get().contributorRank()).to.eq(1)
    })

    it('[OFFCHAIN] Fetch user (Wallet1) 1', async () => {
        const user = await UserModel.FetchByAddress(SOCIETY_ID, wallet.keys().get().address(), wallet.sign().header())
        expect(user).to.not.eq(null)
        if (user){
            userList.addOrUpdate(user)
            expect(userList.count()).to.eq(1)
            expect(user.get().alias().get().username()).to.eq('')
            expect(user.get().info().get().votePowerCount().big()).to.eq(13170731707316n)
            expect(user.get().info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('16.463')
            expect(user.get().info().get().activity().get().lastLughHeight()).to.eq(7)
            expect(user.get().info().get().rewardsReceivedLast90D().big()).to.eq(1800000004n)
            expect(user.get().info().get().contributorRank()).to.eq(1)
            const activity = user.get().info().get().activity().get().activity()
            expect(activity.length).to.eq(3) 
            expect(activity[0]).to.eq(0) 
            expect(activity[1]).to.eq(3) 
            expect(activity[2]).to.eq(0)
        }
    })


    it('[OFFCHAIN] Wallet1 -> create a thread failed 1/3', async () => {
        const p = ThreadModel.NewContent(1, "", "Content of my thread")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce() + 1))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("Not Found")
    })

    it('[OFFCHAIN] Wallet1 -> create a thread failed 2/3', async () => {
        const p = ThreadModel.NewContent(1, "", "Content of my thread")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("you need to create an alias on your address before adding content")
    })

    it('[ONCHAIN] Wallet1 sends some coins to Wallet2 ', async () => {
        const total = wallet.balance().div(10)
        const balanceBefore = wallet.balance()
        const tx = await wallet.buildTX().toAddress(wallet2.keys().get().address(), total)
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            await wallet2.synchronize()
            expect(wallet2.balance().big()).to.eq(total.big())
            expect(wallet.balance().big()).to.eq(balanceBefore.sub(total).sub(tx.get().fees(wallet.fees().get().feePerByte())).big())

            await walletPuts.fetch(wallet.sign().header(), true).all()
            await wallet2Puts.fetch(wallet2.sign().header(), true).all()

            expect(walletPuts.count()).to.eq(6)
            expect(wallet2Puts.count()).to.eq(1)

            const lastPut1 = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
            expect(lastPut1.get().value().big()).to.eq(total.big())
            expect(lastPut1.get().pkh().get().sender()?.hex()).to.eq(wallet.keys().get().pubHash().hex())
            expect(lastPut1.get().pkh().get().recipient()?.hex()).to.eq(wallet2.keys().get().pubHash().hex())
            expect(lastPut1.get().txID().hex()).to.eq(tx.get().hash().hex())
            
            const lastPut2 = wallet2Puts.first() as UnserializedPutModel
            expect(lastPut2.get().value().big()).to.eq(total.big())
            expect(lastPut2.get().pkh().get().sender()?.hex()).to.eq(wallet.keys().get().pubHash().hex())
            expect(lastPut2.get().pkh().get().recipient()?.hex()).to.eq(wallet2.keys().get().pubHash().hex())
            expect(lastPut2.get().txID().hex()).to.eq(tx.get().hash().hex())
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 1/4', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3"])
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
            await walletPuts.fetch(wallet.sign().header(), true).all()
            expect(wallet.balance().big()).to.eq(balance.sub(wallet.costs().get().proposal()).sub(tx.get().fees(wallet.fees().get().feePerByte())).sub(1).big())
            expect(walletPuts.count()).to.eq(7)
            const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
            expect(lastPut.get().value().big()).to.eq(wallet.costs().get().proposal().big())
            expect(lastPut.get().pkh().get().sender()?.hex()).to.eq(wallet.keys().get().pubHash().hex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isApplicationProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq(null)
            expect(lastPut.get().indexProposalTargeted()).to.eq(8)
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 2/4', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("wrong length of content")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 3/4', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(404)
        expect(res.data.error).to.eq("you need to create an alias on your address before adding content")
    })

    it('[OFFCHAIN] Create an alias on Wallet 1', async () => {        
        let alias = wallet.keys().get().alias()
        expect(alias.get().address().get()).to.eq("1DHA8m54a1Vi3oR6LkqkkKYRBR9ZhPjZvC")
        expect(wallet.keys().get().address().get()).to.eq("1DHA8m54a1Vi3oR6LkqkkKYRBR9ZhPjZvC")
        alias.setUsername('fantasim')
        const res = await alias.updateUsername(wallet.keys().get().wallet(), SOCIETY_ID)
        expect(res.status).to.eq(201)

        alias = wallet.keys().get().alias()
        expect(alias.get().address().get()).to.eq("1DHA8m54a1Vi3oR6LkqkkKYRBR9ZhPjZvC")
        expect(alias.get().username()).to.eq('fantasim')
        expect(alias.get().pp()).to.eq(null)
        const urlpp500 = await alias.fetchBigPP()
        expect(urlpp500).to.eq(null)
    })
    /*
    it('[OFFCHAIN] Fetch user (Wallet1) 1', async () => {
        const user = await UserModel.FetchByAddress(SOCIETY_ID, wallet.keys().get().address(), wallet.sign().header())
        expect(user).to.not.eq(null)
        if (user){
            userList.addOrUpdate(user)
            expect(userList.count()).to.eq(1)
            expect(user.get().alias().get().username()).to.eq('fantasim')
            expect(user.get().alias().get().pp()).to.eq(null)
            expect(user.get().info().get().votePowerCount()).to.eq(11763937282229)
            expect(user.get().info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('14.705')
            expect(user.get().info().get().activity().get().lastLughHeight()).to.eq(7)
            expect(user.get().info().get().rewardsReceivedLast90D()).to.eq(1800000004)
            expect(user.get().info().get().contributorRank()).to.eq(1)
            const activity = user.get().info().get().activity().get().activity()
            expect(activity.length).to.eq(3) 
            expect(activity[0]).to.eq(0) 
            expect(activity[1]).to.eq(3) 
            expect(activity[2]).to.eq(0)
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal application content', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 4/4', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
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
            await walletPuts.fetch(wallet.sign().header(), true).all()
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(walletPuts.count()).to.eq(8)
            
            const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
            expect(lastPut.get().value()).to.eq(wallet.costs().get().proposal()+2)
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isConstitutionProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
            expect(lastPut.get().indexProposalTargeted()).to.be.greaterThan(0)
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal constitution failed 1/1', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a constitution proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal constitution content', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a constitution proposal", ["Content 1: https://involvera.com/involvera/proposal/8", "Content 2: https://involvera.com/involvera/proposal/8", "Content 3: https://involvera.com/involvera/proposal/8"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet1 -> create a proposal : costs', async () => {
        const tx = await wallet.buildTX().proposal().cost(BigInt(-1), BigInt(COIN_UNIT * 2000))
        const balance = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            const out = tx.get().outputs().nodeAt(0) as OutputModel
            await walletPuts.fetch(wallet.sign().header(), true).all()
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte()) - 2)
            expect(walletPuts.count()).to.eq(9)
            const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
            expect(lastPut.get().value()).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isCostProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
            expect(lastPut.get().indexProposalTargeted()).to.be.greaterThan(0)
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal cost content failed 1/1', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a cost proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal cost content', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a cost proposal", ["Content 1: https://involvera.com/involvera/proposal/8\nhttps://involvera.com/involvera/proposal/9", "Content 2: https://involvera.com/involvera/proposal/8\nhttps://involvera.com/involvera/proposal/9", "Content 3: https://involvera.com/involvera/proposal/8\nhttps://involvera.com/involvera/proposal/9"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet1 -> create a vote', async () => {
        const proposal = await ProposalModel.FetchByIndex(SOCIETY_ID, 10, wallet.sign().header())
        expect(proposal).not.eq(undefined)
        if (proposal){
            const tx = await wallet.buildTX().vote(proposal.get().pubKH(), true)
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet)
                expect(response.status).to.eq(201)
            }
        }
    })

    let pkhContent0 = ""
    it('[ONCHAIN] Wallet1 -> create a thread', async () => {
        const tx = await wallet.buildTX().thread()
        const balance = wallet.balance()
        expect(tx).not.eq(null)

        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as OutputModel
            pkhContent0 = out.get().contentPKH().toString('hex')
            expect(response.status).to.eq(201)
            await walletPuts.fetch(wallet.sign().header(), true).all()
            expect(walletPuts.count()).to.eq(10)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-2)
            const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
            expect(lastPut.get().value()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(false)
            expect(lastPut.get().contentPKHTargeted()).to.eq("")
            expect(lastPut.get().indexProposalTargeted()).to.eq(-1)
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a thread', async () => {
        const title = "This is a title."
        const content = "Here are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10"

        const p = ThreadModel.NewContent(1, title, content)
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
        expect(p.get().target()).to.eq(null)
        expect(p.get().title()).to.eq(title)
        expect(p.get().content()).to.eq(content)
        expect(p.get().author().get().username()).to.eq('fantasim')
        expect(p.get().author().get().pp()).to.eq(null)
        expect(p.get().societyID()).to.eq(1)
        expect(p.get().pubKH()).to.eq(pkhContent0)
        expect(p.get().replyCount()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward0()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward1()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward2()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward0()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward1()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward2()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countUpvote()).to.eq(0)
        await timeout(1000)
    })

    let pkhContent2 = ""
    it('[ONCHAIN] Wallet1 -> create a rethread on Thread', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent0)
        expect(thread).not.eq(null)
        if (thread){
            const tx = await wallet.buildTX().rethread(thread.get().pubKH())
            const balance = wallet.balance()
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet)
                const out = tx.get().outputs().nodeAt(0) as OutputModel
                pkhContent2 = out.get().contentPKH().toString('hex')
                expect(response.status).to.eq(201)
                await walletPuts.fetch(wallet.sign().header(), true).all()
                expect(walletPuts.count()).to.eq(11)
                expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-1)
                const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
                expect(lastPut.get().value()).to.eq(wallet.costs().get().thread())
                expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
                expect(lastPut.isThread()).to.eq(true)
                expect(lastPut.isRethread()).to.eq(true)
                expect(lastPut.get().contentPKH()).to.eq(pkhContent2)
                expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().pubKH())
                expect(lastPut.get().indexProposalTargeted()).to.eq(-1)
            }
        }
    })


    it('[OFFCHAIN] Wallet1 -> create a rethread on Thread', async () => {
        const title = `This is a title.`
        const content = `Here my favorite Thread: https://involvera.com/involvera/thread/${pkhContent0} \n and these are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10`
        const p = ThreadModel.NewContent(1, title, content)
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)

        const target = p.get().target() as ThreadModel
        expect(target.get().title()).to.eq(title)
        expect(target.get().societyID()).to.eq(1)
        expect(target.get().author().get().username()).to.eq('fantasim')
        expect(target.get().author().get().pp()).to.eq(null)
        expect(target.get().target()).to.eq(null)
        expect(target.get().pubKH()).to.eq(pkhContent0)
        expect(p.get().title()).to.eq(title)
        expect(p.get().content()).to.eq(content)
        expect(p.get().replyCount()).to.eq(0)
        expect(p.get().societyID()).to.eq(1)
        expect(p.get().pubKH()).to.eq(pkhContent2)
        expect(p.get().reward().get().threadReward().get().countReward0()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward1()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward2()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward0()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward1()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward2()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countUpvote()).to.eq(0)
    })

    it('[OFFCHAIN] Create an alias on Wallet 2', async () => {
        const alias = wallet2.keys().get().alias()
        expect(alias.get().address()).to.eq("13gLGwTcdN5YAvhCKpLLY3v3VdCX6UNKU4")
        expect(wallet2.keys().get().address()).to.eq("13gLGwTcdN5YAvhCKpLLY3v3VdCX6UNKU4")
        alias.setUsername('skily')
        const res = await alias.updateUsername(wallet2.keys().get().wallet(), SOCIETY_ID)
        expect(res.status).to.eq(201)

        const alias2 = wallet2.keys().get().alias()
        expect(alias2.get().address()).to.eq("13gLGwTcdN5YAvhCKpLLY3v3VdCX6UNKU4")
        expect(alias2.get().username()).to.eq('skily')
        expect(alias2.get().pp()).to.eq(null)
        const urlpp500 = await alias.fetchBigPP()
        expect(urlpp500).to.eq(null)
    })

    it('[OFFCHAIN] Fetch user (Wallet2) 1', async () => {
        const user = await UserModel.FetchByAddress(SOCIETY_ID, wallet2.keys().get().address(), wallet2.sign().header())
        expect(user).to.not.eq(null)
        if (user){
            userList.addOrUpdate(user)
            expect(userList.count()).to.eq(2)
            expect(user.get().alias().get().username()).to.eq('skily')
            expect(user.get().alias().get().pp()).to.eq(null)
            expect(user.get().info().get().votePowerCount()).to.eq(0)
            expect(user.get().info().get().votePowerPercent(wallet.cch().get().lastHeight())).to.eq(0)
            expect(user.get().info().get().activity().get().lastLughHeight()).to.eq(7)
            expect(user.get().info().get().rewardsReceivedLast90D()).to.eq(0)
            expect(user.get().info().get().contributorRank()).to.eq(168)
            const activity = user.get().info().get().activity().get().activity()
            expect(activity.length).to.eq(3) 
            expect(activity[0]).to.eq(0) 
            expect(activity[1]).to.eq(0) 
            expect(activity[2]).to.eq(0)
        }
    })

    let lastReaction = {tx_id: '', vout: -1}
    it('[ONCHAIN] Wallet2 -> create a reward : upvote', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent0)
        expect(thread).not.eq(undefined)
        if (thread){
            const tx = await wallet2.buildTX().reward(thread, UPVOTE_KEY)        
            const balance = wallet2.balance()
            const balance2 = wallet.balance()
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet2)
                expect(response.status).to.eq(201)
                lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
                await wallet.synchronize()

                await walletPuts.fetch(wallet.sign().header(), true).all()
                await wallet2Puts.fetch(wallet2.sign().header(), true).all()

                expect(wallet2Puts.count()).to.eq(2)
                expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().upvote()-tx.get().fees(wallet2.fees().get().feePerByte())-1)

                expect(balance2).to.eq(wallet.balance()-(wallet.costs().get().upvote() * 0.3)-1)
                expect(walletPuts.count()).to.eq(11)

                const p = wallet2Puts.last() as UnserializedPutModel
                expect(p.get().contentPKHTargeted()).to.eq(pkhContent0)
                expect(p.get().value()).to.eq(wallet2.costs().get().upvote()) 
                expect(p.get().txID()).to.eq(tx.get().hashHex())
                expect(p.get().height()).to.eq(tx.get().lughHeight())
                expect(p.isReward()).to.eq(true)
                expect(p.isUpvote()).to.eq(true)
                expect(p.isReward2()).to.eq(false)
                expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
                expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
                expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())
            }
        }
    })

    it('[ONCHAIN] Wallet2 -> create a reward : reaction0', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent2)
        expect(thread).not.eq(undefined)
        if (thread){
            const tx = await wallet2.buildTX().reward(thread, REWARD0_KEY)
            const balance = wallet2.balance()
            const balanceWallet = wallet.balance()
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet2)
                expect(response.status).to.eq(201)
                lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
                await wallet.synchronize()

                await wallet2Puts.fetch(wallet2.sign().header(), true).all()
                await walletPuts.fetch(wallet.sign().header(), true).all()

                expect(wallet2Puts.count()).to.eq(3)
                expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().reward0()-tx.get().fees(wallet2.fees().get().feePerByte())-1)
                expect(wallet.balance()).to.eq(balanceWallet + (wallet2.costs().get().reward0() * 0.3) + 1)
                expect(walletPuts.count()).to.eq(11)

                const p = wallet2Puts.last() as UnserializedPutModel
                expect(p.get().contentPKHTargeted()).to.eq(pkhContent2)
                expect(p.get().value()).to.eq(wallet2.costs().get().reward0())
                expect(p.get().txID()).to.eq(tx.get().hashHex())
                expect(p.get().height()).to.eq(tx.get().lughHeight())
                expect(p.isReward()).to.eq(true)
                expect(p.isUpvote()).to.eq(false)
                expect(p.isReward0()).to.eq(true)
                expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
                expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())
                expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
            }
        }
    })

    it('[OFFCHAIN] Fetch user (Wallet1) 3', async () => {
        const user = await UserModel.FetchByAddress(SOCIETY_ID, wallet.keys().get().address(), wallet.sign().header())
        expect(user).to.not.eq(null)
        if (user){
            userList.addOrUpdate(user)
            expect(userList.count()).to.eq(2)
            expect(user.get().alias().get().username()).to.eq('fantasim')
            expect(user.get().alias().get().pp()).to.eq(null)
            expect(user.get().info().get().votePowerCount()).to.eq(11763937282229)
            expect(user.get().info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('14.705')
            expect(user.get().info().get().activity().get().lastLughHeight()).to.eq(7)
            expect(user.get().info().get().rewardsReceivedLast90D()).to.eq(4050000006)
            expect(user.get().info().get().contributorRank()).to.eq(1)
            const activity = user.get().info().get().activity().get().activity()
            expect(activity.length).to.eq(3) 
            expect(activity[0]).to.eq(0) 
            expect(activity[1]).to.eq(3) 
            expect(activity[2]).to.eq(0)
        }
    })

    it('[ONCHAIN] Wallet1 -> Check puts:', async () => {
        expect(walletPuts.count()).to.eq(11)
        expect(wallet.info().get().votePowerCount()).to.eq(11763937282229)
        expect(wallet.info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('14.705')
    })

    it('[ONCHAIN] Wallet1 -> Check filters on Puts.', () => {
        expect(walletPuts.filterLughsOnly().count()).to.eq(3)
        expect(walletPuts.filterNonLughsOnly().count()).to.eq(8)
        expect(walletPuts.filterRewardsOnly().count()).to.eq(1)
        expect(walletPuts.filterNonRewardsOnly().count()).to.eq(10)
    })

    it('[ONCHAIN] Wallet1 sends some coins to Wallet3 ', async () => {
        const costs = wallet.costs().get()
        const total = costs.reward0() + costs.reward1() + costs.reward2() * 2 + costs.upvote() 
        const tx = await wallet.buildTX().toAddress(wallet3.keys().get().address(), total)
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            await wallet3.synchronize()
            await walletPuts.fetch(wallet.sign().header(), true).all()
            await wallet3Puts.fetch(wallet3.sign().header(), true).all()
            expect(walletPuts.count()).to.eq(12)
            expect(wallet3Puts.count()).to.eq(1)
            expect(wallet3Puts.filterRewardsOnly().count()).to.eq(0)
            expect(wallet3Puts.filterNonRewardsOnly().count()).to.eq(1)
            
            const p = wallet3Puts.last() as UnserializedPutModel
            expect(p.get().value()).to.eq(total)
            expect(p.get().txID()).to.eq(tx.get().hashHex())
            expect(p.get().height()).to.eq(tx.get().lughHeight())
            expect(p.isReward()).to.eq(false)
            expect(p.isThread()).to.eq(false)
            expect(p.isRegularTx()).to.eq(true)
            expect(p.isVote()).to.eq(false)
            expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
            expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
            expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())

            const p2 = walletPuts.last() as UnserializedPutModel
            expect(p2.get().value()).to.eq(total)
            expect(p2.get().txID()).to.eq(tx.get().hashHex())
            expect(p2.get().height()).to.eq(tx.get().lughHeight())
            expect(p2.isReward()).to.eq(false)
            expect(p2.isThread()).to.eq(false)
            expect(p2.isRegularTx()).to.eq(true)
            expect(p2.isVote()).to.eq(false)
            expect(p2.get().otherPartyAlias()).to.eq(null)
        }
    })

    it('[OFFCHAIN] Create an alias on Wallet 3', async () => {
        const alias = wallet3.keys().get().alias()
        expect(alias.get().address()).to.eq("1KC2hAHD4ekwuzz7szQtQufKKNYoGJ5K6D")
        expect(wallet3.keys().get().address()).to.eq("1KC2hAHD4ekwuzz7szQtQufKKNYoGJ5K6D")
        alias.setUsername('wallet3')
        const res = await alias.updateUsername(wallet3.keys().get().wallet(), SOCIETY_ID)
        expect(res.status).to.eq(201)

        const alias2 = wallet3.keys().get().alias()
        expect(alias2.get().address()).to.eq("1KC2hAHD4ekwuzz7szQtQufKKNYoGJ5K6D")
        expect(alias2.get().username()).to.eq('wallet3')
        expect(alias2.get().pp()).to.eq(null)
    })

    it('[OFFCHAIN] Update PP on Wallet 3', async () => {
        const alias = wallet3.keys().get().alias()
        expect(alias.get().address()).to.eq("1KC2hAHD4ekwuzz7szQtQufKKNYoGJ5K6D")
        expect(alias.get().username()).to.eq("wallet3")
        expect(alias.get().pp()).to.eq(null)

        const f = await fs.readFileSync('./tests/testpp.png')
        const res = await alias.buildPP(f.toString('base64'))
        expect(res.status).to.eq(201)
        const { data } = res
        
        const ppRoute = conf.getRootAPIOffChainUrl() + '/asset/64/' + data
        const pp500Route = conf.getRootAPIOffChainUrl() + '/asset/500/' + data
        const r = await alias.updatePP({pp: ppRoute, pp500: pp500Route, asset_name: data}, wallet3.keys().get().wallet())
        expect(r.status).to.eq(200)
        expect(alias.get().pp()).to.not.eq(null)
        const urlpp500 = await alias.fetchBigPP()
        expect(pp500Route).to.eq(urlpp500)
    })


    it('[OFFCHAIN] Fetch user (Wallet3) 1', async () => {
        const user = await UserModel.FetchByAddress(SOCIETY_ID, wallet3.keys().get().address(), wallet3.sign().header())
        expect(user).to.not.eq(null)
        if (user){
            userList.addOrUpdate(user)
            expect(userList.count()).to.eq(3)
            expect(user.get().alias().get().username()).to.eq('wallet3')
            expect(user.get().alias().get().pp()).to.not.eq(null)
            expect(user.get().info().get().votePowerCount()).to.eq(0)
            expect(user.get().info().get().votePowerPercent(wallet.cch().get().lastHeight())).to.eq(0)
            expect(user.get().info().get().activity().get().lastLughHeight()).to.eq(7)
            expect(user.get().info().get().rewardsReceivedLast90D()).to.eq(0)
            expect(user.get().info().get().contributorRank()).to.eq(168)
            const activity = user.get().info().get().activity().get().activity()
            expect(activity.length).to.eq(3) 
            expect(activity[0]).to.eq(0) 
            expect(activity[1]).to.eq(0) 
            expect(activity[2]).to.eq(0)
        }
    })

    it(`[OFFCHAIN] Last puts check Wallet after alias setup`, async () => {
        await walletPuts.fetch(wallet.sign().header(), true).all()
        const p = walletPuts.last() as UnserializedPutModel
        expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet3.keys().get().alias().get().username())
        expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet3.keys().get().alias().get().pp())
        expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet3.keys().get().alias().get().address())
    })

    it('[ONCHAIN] Wallet3 -> create a reward : reaction0', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent2)
        expect(thread).not.eq(undefined)
        if (thread){
            const tx = await wallet3.buildTX().reward(thread, REWARD0_KEY)
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet3)
                expect(response.status).to.eq(201)
                lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
                await wallet3.synchronize()
                await wallet3Puts.fetch(wallet3.sign().header(), true).all()
                expect(wallet3Puts.count()).to.eq(2)
                expect(wallet3Puts.filterRewardsOnly().count()).to.eq(1)
                expect(wallet3Puts.filterNonRewardsOnly().count()).to.eq(1)

                const p = wallet3Puts.last() as UnserializedPutModel
                expect(p.get().contentPKHTargeted()).to.eq(pkhContent2)
                expect(p.get().value()).to.eq(wallet3.costs().get().reward0())
                expect(p.get().txID()).to.eq(tx.get().hashHex())
                expect(p.get().height()).to.eq(tx.get().lughHeight())
                expect(p.isReward()).to.eq(true)
                expect(p.isUpvote()).to.eq(false)
                expect(p.isReward0()).to.eq(true)
                expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
                expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
                expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())
            }
        }
    })

    it('[ONCHAIN] Wallet3 -> create a reward : reaction1', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent2)
        expect(thread).not.eq(undefined)
        if (thread){
            const tx = await wallet3.buildTX().reward(thread, REWARD1_KEY)
            expect(tx).not.eq(null)
            if (thread){
                if (tx){
                    const response = await tx.broadcast(wallet3)
                    expect(response.status).to.eq(201)
                    lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
                    await wallet3.synchronize()
                    await wallet3Puts.fetch(wallet3.sign().header(), true).all()
                    expect(wallet3Puts.count()).to.eq(3)
                    expect(wallet3Puts.filterRewardsOnly().count()).to.eq(2)
                    expect(wallet3Puts.filterNonRewardsOnly().count()).to.eq(1)

                    const p = wallet3Puts.last() as UnserializedPutModel
                    expect(p.get().contentPKHTargeted()).to.eq(pkhContent2)
                    expect(p.get().value()).to.eq(wallet3.costs().get().reward1())
                    expect(p.get().txID()).to.eq(tx.get().hashHex())
                    expect(p.get().height()).to.eq(tx.get().lughHeight())
                    expect(p.isReward()).to.eq(true)
                    expect(p.isReward0()).to.eq(false)
                    expect(p.isReward1()).to.eq(true)
                    expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
                    expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
                    expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())
                }
            }
        }
    })

    it('[ONCHAIN] Wallet3 -> create a reward : reaction2', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent2)
        expect(thread).not.eq(undefined)        
        if (thread){
            const tx = await wallet3.buildTX().reward(thread, REWARD2_KEY)
            expect(tx).not.eq(null)

            if (tx){
                const response = await tx.broadcast(wallet3)
                expect(response.status).to.eq(201)
                lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
                await wallet3.synchronize()
                await wallet3Puts.fetch(wallet3.sign().header(), true).all()
                expect(wallet3Puts.count()).to.eq(4)
                expect(wallet3Puts.filterRewardsOnly().count()).to.eq(3)
                expect(wallet3Puts.filterNonRewardsOnly().count()).to.eq(1)

                const p = wallet3Puts.last() as UnserializedPutModel
                expect(p.get().contentPKHTargeted()).to.eq(pkhContent2)
                expect(p.get().value()).to.eq(wallet3.costs().get().reward2())
                expect(p.get().txID()).to.eq(tx.get().hashHex())
                expect(p.get().height()).to.eq(tx.get().lughHeight())
                expect(p.isReward()).to.eq(true)
                expect(p.isReward2()).to.eq(true)
                expect(p.isReward0()).to.eq(false)
                expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
                expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
                expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())
            }
        }
    })

    it('[ONCHAIN] Wallet3 -> create a reward : upvote', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, pkhContent2)
        expect(thread).not.eq(undefined)
        if (thread){
            const tx = await wallet3.buildTX().reward(thread, 'upvote')
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet3)
                expect(response.status).to.eq(201)
                lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
                await wallet3.synchronize()
                await wallet3Puts.fetch(wallet3.sign().header(), true).all()
                await walletPuts.fetch(wallet.sign().header(), true).all()
                expect(walletPuts.count()).to.eq(12)

                expect(wallet3Puts.count()).to.eq(5)
                expect(wallet3Puts.filterRewardsOnly().count()).to.eq(4)
                expect(wallet3Puts.filterNonRewardsOnly().count()).to.eq(1)

                const p = wallet3Puts.last() as UnserializedPutModel
                expect(p.get().contentPKHTargeted()).to.eq(pkhContent2)
                expect(p.get().value()).to.eq(wallet3.costs().get().upvote())
                expect(p.get().txID()).to.eq(tx.get().hashHex())
                expect(p.get().height()).to.eq(tx.get().lughHeight())
                expect(p.isReward()).to.eq(true)
                expect(p.isUpvote()).to.eq(true)
                expect(p.isReward0()).to.eq(false)
                expect(p.get().otherPartyAlias()?.get().username()).to.eq(wallet.keys().get().alias().get().username())
                expect(p.get().otherPartyAlias()?.get().pp()).to.eq(wallet.keys().get().alias().get().pp())
                expect(p.get().otherPartyAlias()?.get().address()).to.eq(wallet.keys().get().alias().get().address())
            }
        }
    })

    it('[OFFCHAIN] Fetch user (Wallet1) 3', async () => {
        const user = await UserModel.FetchByAddress(SOCIETY_ID, wallet.keys().get().address(), wallet.sign().header())
        expect(user).to.not.eq(null)
        if (user){
            userList.addOrUpdate(user)
            expect(userList.count()).to.eq(3)
            expect(user.get().alias().get().username()).to.eq('fantasim')
            expect(user.get().alias().get().pp()).to.eq(null)
            expect(user.get().info().get().votePowerCount()).to.eq(11763937282229)
            expect(user.get().info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('14.705')
            expect(user.get().info().get().activity().get().lastLughHeight()).to.eq(7)
            expect(user.get().info().get().rewardsReceivedLast90D()).to.eq(43800000008)
            expect(user.get().info().get().contributorRank()).to.eq(1)
            const activity = user.get().info().get().activity().get().activity()
            expect(activity.length).to.eq(3) 
            expect(activity[0]).to.eq(0) 
            expect(activity[1]).to.eq(3) 
            expect(activity[2]).to.eq(0)
        }
    })

    let society: SocietyModel | null = null
    it('Fetch Society', async () => {
        society = await SocietyModel.fetch(1)
        if (society){
            expect(society.get().stats().get().activeAddresses()).to.eq(59)
            expect(society.get().stats().get().totalContributor()).to.eq(168)
            expect(society.get().stats().get().lastHeight()).to.eq(8)
            expect(BigInt(society.get().stats().get().circulatingVPSupply())).to.eq(BigInt(8 * LUGH_AMOUNT))
            expect(society.get().stats().get().mostActiveAddresses().count()).to.eq(1)
            expect(society.get().name()).to.eq("Involvera")
            expect(society.get().domain()).to.eq("involvera.com")

            const lThreadChange = society.get().stats().get().lastThreadCostChange()
            expect(lThreadChange.get().proposalIndex()).to.eq(4)
            expect(lThreadChange.get().threadCost()).to.eq(LUGH_AMOUNT / 200)

            const lProposalChange = society.get().stats().get().lastProposalCostChange()
            expect(lProposalChange.get().proposalIndex()).to.eq(3)
            expect(lProposalChange.get().proposalCost()).to.eq(LUGH_AMOUNT / 20)

            const costs = society.get().costs()
            const consti = society.get().constitution()

            expect(costs.get().thread()).to.eq(LUGH_AMOUNT / 200)
            expect(costs.get().proposal()).to.eq(LUGH_AMOUNT / 20)
            expect(consti.get().constitution().count()).to.eq(10)
            expect(consti.get().proposal()).to.eq(null)
            const constitution = consti.get().constitution()
            expect((constitution.nodeAt(0) as RuleModel).get().title() == 'This is the new rule #1 for my constitution')
            expect((constitution.nodeAt(0) as RuleModel).get().content() == "Let's write some guidelines to respect to make this community the best.")
            expect((constitution.nodeAt(1) as RuleModel).get().title() == 'You should follow this.')
            expect((constitution.nodeAt(1) as RuleModel).get().content() == "If you earn a living with crypto, then... good luck!")
        }
    })

    it('Fetch contributor stats', async () => {
        const society = await SocietyModel.fetch(1)
        if (society){
            let addr = wallet.keys().get().address()
            await society.fetchContributor(addr)
            let c = society.get().contributors().findByAddress(addr)
            expect(c?.get().position()).to.eq(1)

            addr = wallet2.keys().get().address()
            await society.fetchContributor(addr)
            c = society.get().contributors().findByAddress(addr)
            expect(c?.get().position()).to.eq(168)

            addr = wallet3.keys().get().address()
            await society.fetchContributor(addr)
            c = society.get().contributors().findByAddress(addr)
            expect(c?.get().position()).to.eq(168)
        }
    })

    it('Fetch Proposal list', async () => {
        const society = await SocietyModel.fetch(1)
        const proposals = new ProposalCollection([],{})
        proposals.setSociety(society as SocietyModel)
        await proposals.fetch(wallet.sign().header(), true)    

        expect(proposals).not.to.eq(null)
        if (proposals){
            expect(proposals.count()).to.eq(3)
            const proposal1 = proposals.nodeAt(0) as ProposalModel
            const proposal2 = proposals.nodeAt(1) as ProposalModel
            const proposal3 = proposals.nodeAt(2) as ProposalModel

            expect(proposal1.get().title()).to.eq("This is the title of a cost proposal")
            expect(proposal1.get().index()).to.eq(10)
            expect(proposal1.get().layer()).to.eq("Economy")
            expect(proposal1.get().context()).to.eq(null)
            expect(proposal1.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal1.get().vote().get().approved()).to.eq(-1)
            expect(proposal1.get().endAtLH()).to.eq(28)
            expect(proposal1.get().estimatedEndAtTime().toDateString()).to.eq(new Date(proposal1.get().createdAt().getTime() + ((N_LUGH_VOTE_DURATION) * LUGH_EVERY_N_S * 1000)).toDateString())

            expect(() => proposal1.get().costs()).to.throw(Error)
            expect(proposal1.get().context()).to.eq(null)
            expect(proposal1.get().pubKH()).to.eq(undefined)
            const userVote = proposal1.get().userVote() as UserVoteModel
            expect(userVote.get().hasApproved()).to.eq(true)

            expect(proposal1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(proposal1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(proposal1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())

            const fullProposal1 = await ProposalModel.FetchByIndex(1, 10, wallet.sign().header())            
            if (fullProposal1){
                const context = fullProposal1.get().context()
                expect((context as ICostProposal).proposal).to.eq(500000000000)
                expect((context as ICostProposal).thread).to.eq(50000000000)

                const content = fullProposal1.get().content()
                expect(content.length).to.eq(3)
                expect(content[0]).to.eq("Content 1: https://involvera.com/involvera/proposal/8\nhttps://involvera.com/involvera/proposal/9")
                expect(content[1]).to.eq("Content 2: https://involvera.com/involvera/proposal/8\nhttps://involvera.com/involvera/proposal/9")
                expect(content[2]).to.eq("Content 3: https://involvera.com/involvera/proposal/8\nhttps://involvera.com/involvera/proposal/9")

                expect(fullProposal1.get().costs().proposal).to.eq(BigInt(2000 * COIN_UNIT))
                expect(fullProposal1.get().costs().thread).to.eq(BigInt(-1))
                expect(fullProposal1.get().pubKH()).to.eq("e4c60b0853e76a70d864fafed15964af337313a6")
                expect(fullProposal1.get().context()).to.not.eq(null)
            }
            
            expect(proposal2.get().title()).to.eq("This is the title of a constitution proposal")
            expect(proposal2.get().index()).to.eq(9)
            expect(proposal2.get().layer()).to.eq("Constitution")
            expect(proposal2.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal2.get().vote().get().approved()).to.eq(-1)
            expect(proposal2.get().endAtLH()).to.eq(28)
            expect(proposal2.get().userVote()).to.eq(null)
            expect(proposal2.get().estimatedEndAtTime().toDateString()).to.eq(new Date(proposal2.get().createdAt().getTime() + ((N_LUGH_VOTE_DURATION) * LUGH_EVERY_N_S * 1000)).toDateString())

            expect(() => proposal2.get().constitution()).to.throw(Error)
            expect(() => proposal2.get().costs()).to.throw(Error)
            expect(proposal2.get().context()).to.eq(null)
            expect(proposal2.get().pubKH()).to.eq(undefined)
            expect(proposal2.get().author().get().address()).eq(wallet.keys().get().address())
            expect(proposal2.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(proposal2.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())

            const fullProposal2 = await ProposalModel.FetchByIndex(1, 9, wallet.sign().header())
            if (fullProposal2){
                const content = fullProposal2.get().content()
                expect(content.length).to.eq(3)
                const context = fullProposal2.get().context()
                expect((context as IConstitutionProposalUnRaw).constitution.length).to.eq(10)
                expect(content[0]).to.eq("Content 1: https://involvera.com/involvera/proposal/8")
                expect(content[1]).to.eq("Content 2: https://involvera.com/involvera/proposal/8")
                expect(content[2]).to.eq("Content 3: https://involvera.com/involvera/proposal/8")

                expect(fullProposal2.get().author().get().address()).eq(wallet.keys().get().address())
                expect(fullProposal2.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
                expect(fullProposal2.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
                expect(fullProposal2.get().pubKH()).to.eq("b4cb71271efc2ac6d75d1a337fc1873d10ffa5da")
                expect(fullProposal2.get().constitution()[0].content).to.eq("Content #0")
                expect(fullProposal2.get().constitution()[0].title).to.eq("Title #0")
                expect(fullProposal2.get().context()).to.not.eq(null)
            }

            expect(proposal2.get().title()).to.eq("This is the title of a constitution proposal")
            expect(proposal2.get().index()).to.eq(9)
            expect(proposal2.get().layer()).to.eq("Constitution")
            expect(proposal2.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal2.get().vote().get().approved()).to.eq(-1)
            expect(proposal2.get().endAtLH()).to.eq(28)
            expect(proposal2.get().userVote()).to.eq(null)
            expect(proposal3.get().estimatedEndAtTime().toDateString()).to.eq(new Date(proposal3.get().createdAt().getTime() + ((N_LUGH_VOTE_DURATION) * LUGH_EVERY_N_S * 1000)).toDateString())

            expect(() => proposal2.get().constitution()).to.throw(Error)
            expect(() => proposal2.get().costs()).to.throw(Error)
            expect(proposal2.get().context()).to.eq(null)
            expect(proposal2.get().pubKH()).to.eq(undefined)

            expect(proposal3.get().title()).to.eq("This is the title of an application proposal")
            expect(proposal3.get().index()).to.eq(8)
            expect(proposal3.get().layer()).to.eq("Application")
            expect(proposal3.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal3.get().vote().get().approved()).to.eq(-1)
            expect(proposal3.get().endAtLH()).to.eq(28)
            expect(proposal3.get().userVote()).to.eq(null)
            expect(proposal3.get().author().get().address()).eq(wallet.keys().get().address())
            expect(proposal3.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(proposal3.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())

            expect(proposal3.get().context()).to.eq(null)
            expect(proposal3.get().pubKH()).to.eq(undefined)

            const fullProposal3 = await ProposalModel.FetchByIndex(1, 8, wallet.sign().header())
            if (fullProposal3){
                expect(fullProposal3.get().context()).to.eq(null)
                const content = fullProposal3.get().content()
                expect(content.length).to.eq(4)
                expect(content[0]).to.eq("Content 1")
                expect(content[1]).to.eq("Content 2")
                expect(content[2]).to.eq("Content 3")
                expect(content[3]).to.eq("Content 4")
                expect(fullProposal3.get().context()).to.eq(null)
                expect(fullProposal3.get().author().get().address()).eq(wallet.keys().get().address())
                expect(fullProposal3.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
                expect(fullProposal3.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
                expect(fullProposal3.get().pubKH()).to.eq("41c7fb5001fdb63ebd4638fc6e900d192c4c0041")
            }
        }
    })
    
    it('Fetch Target Thread List - PREVIEW MODE', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        threads.setTargetPKH("4001282825b5b91d792787c1b69ce72d996a3e2e")
        await threads.fetch(wallet3.sign().header(), true)   
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(1)
            const thread1 = threads.nodeAt(0) as ThreadModel
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq("This is a title.")
            expect(thread1.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(2)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward0()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward2()).to.eq(1)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread1.get().replyCount()).to.eq(0)
        }
    })
    
    it('Fetch Thread and Target', async () => {
        const thread1 = await ThreadModel.FetchByPKH(SOCIETY_ID, "0e01d4ea4c3b4e090b5287bbc4efb024f6d38642", wallet3.sign().header())
        expect(thread1).not.to.eq(null)
        if (thread1){
            const target = thread1.get().target() as ThreadModel
        
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq("This is a title.")
            expect(thread1.get().content()).to.eq("Here my favorite Thread: https://involvera.com/involvera/thread/4001282825b5b91d792787c1b69ce72d996a3e2e \n and these are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10")
            expect(thread1.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(2)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward0()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward2()).to.eq(1)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread1.get().replyCount()).to.eq(0)
            expect(thread1.get().target()).to.not.eq(null)

            expect(target.get().author().get().address()).eq(wallet.keys().get().address())
            expect(target.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(target.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(target.get().title()).to.eq("This is a title.")
            expect(target.get().content()).to.eq("Here are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10")
            expect(target.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            // expect(target.get().embeds().length).to.eq(3)
            expect(target.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(target.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(target.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(target.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(target.get().reward().get().userReward().get().countUpvote()).to.eq(0)
            expect(target.get().reward().get().userReward().get().countReward0()).to.eq(0)
            expect(target.get().reward().get().userReward().get().countReward1()).to.eq(0)
            expect(target.get().reward().get().userReward().get().countReward2()).to.eq(0)
            expect(target.get().contentLink().get().targetContent()).to.eq("")
            expect(target.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(target.get().replyCount()).to.eq(1)
            expect(target.get().target()).to.eq(null)
        }
    })

    it('Fetch Target Thread List - FULL MODE', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        threads.setTargetPKH("4001282825b5b91d792787c1b69ce72d996a3e2e")
        await threads.fetchFullReplies(wallet3.sign().header(), true)   
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(1)
            const thread1 = threads.nodeAt(0) as ThreadModel
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq("This is a title.")
            expect(thread1.get().content()).to.eq("Here my favorite Thread: https://involvera.com/involvera/thread/4001282825b5b91d792787c1b69ce72d996a3e2e \n and these are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10")
            expect(thread1.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(2)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward0()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward2()).to.eq(1)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread1.get().replyCount()).to.eq(0)
            expect(thread1.get().target()).to.eq(null)
        }
    })

    it('Fetch Thread list', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        await threads.fetch(wallet3.sign().header(), true)    

        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(2)
            const thread1 = threads.nodeAt(0) as ThreadModel
            const thread2 = threads.nodeAt(1) as ThreadModel

            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq("This is a title.")
            expect(thread1.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(2)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward0()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward2()).to.eq(1)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread1.get().replyCount()).to.eq(0)
            const target = thread1.get().target() as ThreadModel
            expect(target.get().title()).to.eq('This is a title.')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().author().get().username()).to.eq('fantasim')
            expect(target.get().author().get().pp()).to.eq(null)
            expect(target.get().target()).to.eq(null)
            expect(target.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")

            const fullThread1 = await ThreadModel.FetchByPKH(1, thread1.get().pubKH())
            if (fullThread1){
                expect(fullThread1.get().content()).to.eq("Here my favorite Thread: https://involvera.com/involvera/thread/4001282825b5b91d792787c1b69ce72d996a3e2e \n and these are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10")
                expect(fullThread1.get().replyCount()).to.eq(0)
                const target = fullThread1.get().target() as ThreadModel
                expect(target.get().title()).to.eq('This is a title.')
                expect(target.get().societyID()).to.eq(1)
                expect(target.get().author().get().username()).to.eq('fantasim')
                expect(target.get().author().get().pp()).to.eq(null)
                expect(target.get().target()).to.eq(null)
                expect(target.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            }

            expect(thread2.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread2.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread2.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread2.get().title()).to.eq("This is a title.")
            expect(thread2.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread2.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread2.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread2.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread2.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread2.get().contentLink().get().targetContent()).to.eq("")
            expect(thread2.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread2.get().target()).to.eq(null)
            expect(thread2.get().replyCount()).to.eq(1)
            const fullThread2 = await ThreadModel.FetchByPKH(1, thread2.get().pubKH())
            if (fullThread2){
                expect(fullThread2.get().content()).to.eq("Here are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10")
                expect(fullThread2.get().target()).to.eq(null)
                expect(fullThread2.get().replyCount()).to.eq(1)
            }
        }
    })

    it('Fetch User Thread list', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setAddress(wallet.keys().get().address())
        threads.setSociety(society as SocietyModel)
        await threads.fetchUserThreads(wallet3.sign().header(), true)    

        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(2)
            const thread1 = threads.nodeAt(0) as ThreadModel
            const thread2 = threads.nodeAt(1) as ThreadModel

            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().title()).to.eq("This is a title.")
            expect(thread1.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(2)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countUpvote()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward0()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward1()).to.eq(1)
            expect(thread1.get().reward().get().userReward().get().countReward2()).to.eq(1)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread1.get().replyCount()).to.eq(0)
            const target = thread1.get().target() as ThreadModel
            expect(target.get().title()).to.eq('This is a title.')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().author().get().username()).to.eq('fantasim')
            expect(target.get().author().get().pp()).to.eq(null)
            expect(target.get().target()).to.eq(null)
            expect(target.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")

            expect(thread2.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread2.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread2.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread2.get().title()).to.eq("This is a title.")
            expect(thread2.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(thread2.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(thread2.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread2.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread2.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread2.get().contentLink().get().targetContent()).to.eq("")
            expect(thread2.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread2.get().target()).to.eq(null)
            expect(thread2.get().replyCount()).to.eq(1)
        }
    })

    it('[ONCHAIN] Trigger lugh transaction', async () => {
        await walletPuts.fetch(wallet.sign().header(), true).all()
        await wallet.synchronize()
        expect(wallet.balance()).to.eq(8640842342371)
        expect(wallet.cch().get().list().length).to.eq(8)
        expect(wallet.utxos().get().count()).to.eq(5)
        expect(walletPuts.count()).to.eq(12)
        const res = await axios(`${conf.getRootAPIChainUrl()}/lugh`, {
            method: 'POST',
        })
        expect(res.status).to.eq(200)
        await walletPuts.fetch(wallet.sign().header(), true).all()
        await wallet.synchronize()
        expect(wallet.balance()).to.eq(18634907698295)
        expect(wallet.cch().get().list().length).to.eq(9)
        expect(wallet.utxos().get().count()).to.eq(6)
        expect(walletPuts.count()).to.eq(13)
    })

    it('[ONCHAIN] Wallet1 -> create a rethread on Proposal', async () => {
        const proposal = await ProposalModel.FetchByIndex(1, 10)
        expect(proposal).not.eq(undefined)
        const tx = await wallet.buildTX().rethread(proposal?.get().contentLink().get().output().get().contentPKH().toString('hex') as string)
        const balance = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as OutputModel
            pkhContent2 = out.get().contentPKH().toString('hex')
            expect(response.status).to.eq(201)
            await walletPuts.fetch(wallet.sign().header(), true).all()
            expect(walletPuts.count()).to.eq(14)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte()))
            const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
            expect(lastPut.get().value()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq(pkhContent2)
            expect(lastPut.get().contentPKHTargeted()).to.eq(proposal?.get().contentLink().get().output().get().contentPKH().toString('hex'))
            expect(lastPut.get().indexProposalTargeted()).to.eq(-1)
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a rethread on Proposal', async () => {
        const t = ThreadModel.NewContent(1, '', `Im making my first thread about a proposal.`)
        const res = await t.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })
    
    it('Fetch Target Thread List 2 - PREVIEW MODE ', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        const proposal = await ProposalModel.FetchByIndex(1, 10)
        expect(proposal).to.not.eq(undefined)
        if (proposal){
            threads.setTargetPKH(proposal.get().pubKH())
        }

        await threads.fetch(wallet3.sign().header(), true)   
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(1)
            const thread1 = threads.nodeAt(0) as ThreadModel
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().pubKH()).to.eq("06ec72410c9dc2e528fe6e9ef22071b6278818dd")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("e4c60b0853e76a70d864fafed15964af337313a6")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            
            const target = thread1.get().target() as ProposalModel
            expect(target.get().title()).to.eq('This is the title of a cost proposal')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().index()).to.eq(10)
            expect(target.get().layer()).to.eq("Economy")
            expect(target.get().vote().get().closedAtLH()).to.eq(28)
            expect(target.get().vote().get().approved()).to.eq(-1)
        }
    })


    it('Fetch Thread list 2', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        await threads.fetch(wallet.sign().header(), true)    

        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(3)
            const thread1 = threads.nodeAt(0) as ThreadModel

            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().pubKH()).to.eq("06ec72410c9dc2e528fe6e9ef22071b6278818dd")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("e4c60b0853e76a70d864fafed15964af337313a6")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            
            const target = thread1.get().target() as ProposalModel
            expect(target.get().title()).to.eq('This is the title of a cost proposal')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().index()).to.eq(10)
            expect(target.get().layer()).to.eq("Economy")
            expect(target.get().vote().get().closedAtLH()).to.eq(28)
            expect(target.get().vote().get().approved()).to.eq(-1)

            const fullThread1 = await ThreadModel.FetchByPKH(1, thread1.get().pubKH())
            if (fullThread1){
                expect(fullThread1.get().content()).to.eq("Im making my first thread about a proposal.")
                const target = fullThread1.get().target() as ProposalModel
                expect(target.get().title()).to.eq('This is the title of a cost proposal')
                expect(target.get().societyID()).to.eq(1)
                expect(target.get().index()).to.eq(10)
                expect(target.get().layer()).to.eq("Economy")
                expect(target.get().vote().get().closedAtLH()).to.eq(28)
                expect(target.get().vote().get().approved()).to.eq(-1)
            }
        }
    })

    it('Fetch User Thread list 2', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setAddress(wallet.keys().get().address())
        threads.setSociety(society as SocietyModel)
        await threads.fetchUserThreads(wallet.sign().header(), true)    

        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(3)
            const thread1 = threads.nodeAt(0) as ThreadModel

            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().pubKH()).to.eq("06ec72410c9dc2e528fe6e9ef22071b6278818dd")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("e4c60b0853e76a70d864fafed15964af337313a6")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            
            const target = thread1.get().target() as ProposalModel
            expect(target.get().title()).to.eq('This is the title of a cost proposal')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().index()).to.eq(10)
            expect(target.get().layer()).to.eq("Economy")
            expect(target.get().vote().get().closedAtLH()).to.eq(28)
            expect(target.get().vote().get().approved()).to.eq(-1)
        }
    })


    it('[ONCHAIN] Wallet1 -> create a rethread on Thread', async () => {
        const thread = await ThreadModel.FetchByPKH(SOCIETY_ID, "0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        expect(thread).not.eq(undefined)
        if (thread){
            const tx = await wallet.buildTX().rethread(thread.get().pubKH())
            const balance = wallet.balance()
            expect(tx).not.eq(null)
            if (tx){
                const response = await tx.broadcast(wallet)
                const out = tx.get().outputs().nodeAt(0) as OutputModel
                pkhContent2 = out.get().contentPKH().toString('hex')
                expect(response.status).to.eq(201)
                await walletPuts.fetch(wallet.sign().header(), true).all()
                expect(walletPuts.count()).to.eq(15)
                expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte()))
                const lastPut = walletPuts.sortByCreationDateDesc().first() as UnserializedPutModel
                expect(lastPut.get().value()).to.eq(wallet.costs().get().thread())
                expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
                expect(lastPut.isThread()).to.eq(true)
                expect(lastPut.isRethread()).to.eq(true)
                expect(lastPut.get().contentPKH()).to.eq(pkhContent2)
                expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().pubKH())
                expect(lastPut.get().indexProposalTargeted()).to.eq(-1)
            }
        }
    })


    it('[OFFCHAIN] Wallet1 -> create a rethread on rethread of a Thread', async () => {
        const title = ``
        const content = `I have always loved to be into quick answers just for the sake of answering crap.`
        const p = ThreadModel.NewContent(1, title, content)
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)

        const target = p.get().target() as ThreadModel
        expect(target.get().title()).to.eq(`This is a title.`)
        expect(target.get().societyID()).to.eq(1)
        expect(target.get().author().get().username()).to.eq('fantasim')
        expect(target.get().author().get().pp()).to.eq(null)
        expect(target.get().target()).to.not.eq(null)
        expect(target.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")

        const target2 = target.get().target() as ThreadModel
        expect(target2.get().title()).to.eq(`This is a title.`)
        expect(target2.get().societyID()).to.eq(1)
        expect(target2.get().author().get().username()).to.eq('fantasim')
        expect(target2.get().author().get().pp()).to.eq(null)
        expect(target2.get().target()).to.eq(null)
        expect(target2.get().pubKH()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")

        expect(p.get().title()).to.eq(title)
        expect(p.get().content()).to.eq(content)
        expect(p.get().societyID()).to.eq(1)
        expect(p.get().pubKH()).to.eq(pkhContent2)
        expect(p.get().reward().get().threadReward().get().countReward0()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward1()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countReward2()).to.eq(0)
        expect(p.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward0()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward1()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countReward2()).to.eq(0)
        expect(p.get().reward().get().userReward().get().countUpvote()).to.eq(0)
    })

    it('Fetch Target Thread List 3 - PREVIEW MODE', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        threads.setTargetPKH("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        await threads.fetch(wallet3.sign().header(), true)   
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(1)
            const thread1 = threads.nodeAt(0) as ThreadModel
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().pubKH()).to.eq("3aa6c96a0ee66445c749f87199fb8d5ea45b95cb")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            expect(thread1.get().replyCount()).to.eq(0)

            const target = thread1.get().target() as ThreadModel
            expect(target.get().title()).to.eq('This is a title.')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().author().get().username()).to.eq('fantasim')
            expect(target.get().author().get().pp()).to.eq(null)
            expect(target.get().target()).to.eq(null)
            expect(target.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        }
    })

    it('Fetch Thread and Target 3', async () => {
        const thread1 = await ThreadModel.FetchByPKH(SOCIETY_ID, "3aa6c96a0ee66445c749f87199fb8d5ea45b95cb", wallet3.sign().header())
        expect(thread1).not.to.eq(null)
        if (thread1){
            const target = thread1.get().target() as ThreadModel
        
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().title()).to.eq("")
            expect(thread1.get().content()).to.eq("I have always loved to be into quick answers just for the sake of answering crap.")
            expect(thread1.get().pubKH()).to.eq("3aa6c96a0ee66445c749f87199fb8d5ea45b95cb")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().reward().get().userReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().userReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().userReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().userReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            expect(thread1.get().replyCount()).to.eq(0)
            expect(thread1.get().target()).to.not.eq(null) 

            expect(target.get().author().get().address()).eq(wallet.keys().get().address())
            expect(target.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(target.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(target.get().title()).to.eq("This is a title.")
            expect(target.get().content()).to.eq("Here my favorite Thread: https://involvera.com/involvera/thread/4001282825b5b91d792787c1b69ce72d996a3e2e \n and these are the 3 proposals I like:\n1. https://involvera.com/involvera/proposal/8\n2. https://involvera.com/involvera/proposal/9\n3. https://involvera.com/involvera/proposal/10")
            expect(target.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(target.get().reward().get().threadReward().get().countUpvote()).to.eq(1)
            expect(target.get().reward().get().threadReward().get().countReward0()).to.eq(2)
            expect(target.get().reward().get().threadReward().get().countReward1()).to.eq(1)
            expect(target.get().reward().get().threadReward().get().countReward2()).to.eq(1)
            expect(target.get().reward().get().userReward().get().countUpvote()).to.eq(1)
            expect(target.get().reward().get().userReward().get().countReward0()).to.eq(1)
            expect(target.get().reward().get().userReward().get().countReward1()).to.eq(1)
            expect(target.get().reward().get().userReward().get().countReward2()).to.eq(1)
            expect(target.get().contentLink().get().targetContent()).to.eq("4001282825b5b91d792787c1b69ce72d996a3e2e")
            expect(target.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(target.get().replyCount()).to.eq(1)
            expect(target.get().target()).to.not.eq(null)
        }
    })

    it('Fetch Target Thread List 3 - PREVIEW MODE', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        threads.setTargetPKH("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        await threads.fetch(wallet3.sign().header(), true)   
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(1)
            const thread1 = threads.nodeAt(0) as ThreadModel
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().pubKH()).to.eq("3aa6c96a0ee66445c749f87199fb8d5ea45b95cb")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            expect(thread1.get().replyCount()).to.eq(0)

            const target = thread1.get().target() as ThreadModel
            expect(target.get().title()).to.eq('This is a title.')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().author().get().username()).to.eq('fantasim')
            expect(target.get().author().get().pp()).to.eq(null)
            expect(target.get().target()).to.eq(null)
            expect(target.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        }
    })


    it('Fetch Target Thread List 3 - FULL MODE', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        threads.setTargetPKH("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        await threads.fetchFullReplies(wallet3.sign().header(), true)   
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(1)
            const thread1 = threads.nodeAt(0) as ThreadModel
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().content()).to.eq("I have always loved to be into quick answers just for the sake of answering crap.")
            expect(thread1.get().pubKH()).to.eq("3aa6c96a0ee66445c749f87199fb8d5ea45b95cb")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            expect(thread1.get().replyCount()).to.eq(0)
            expect(thread1.get().target()).to.eq(null)
        }
    })


    it('Fetch User Thread list 3', async () => {
        const society = await SocietyModel.fetch(1)
        const threads = new ThreadCollection([],{})
        threads.setSociety(society as SocietyModel)
        threads.setAddress(wallet.keys().get().address())
        await threads.fetch(wallet.sign().header(), true)    

        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(4)
            const thread1 = threads.nodeAt(0) as ThreadModel
            const thread2 = threads.nodeAt(2) as ThreadModel

            expect(thread2.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread2.get().replyCount()).to.eq(1)
            
            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().author().get().pp()).eq(wallet.keys().get().alias().get().pp())
            expect(thread1.get().title()).to.eq('')
            expect(thread1.get().pubKH()).to.eq("3aa6c96a0ee66445c749f87199fb8d5ea45b95cb")
            expect(thread1.get().reward().get().threadReward().get().countUpvote()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward0()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward1()).to.eq(0)
            expect(thread1.get().reward().get().threadReward().get().countReward2()).to.eq(0)
            expect(thread1.get().contentLink().get().targetContent()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50000000000))
            expect(thread1.get().replyCount()).to.eq(0)

            const target = thread1.get().target() as ThreadModel
            expect(target.get().title()).to.eq('This is a title.')
            expect(target.get().societyID()).to.eq(1)
            expect(target.get().author().get().username()).to.eq('fantasim')
            expect(target.get().author().get().pp()).to.eq(null)
            expect(target.get().target()).to.eq(null)
            expect(target.get().pubKH()).to.eq("0e01d4ea4c3b4e090b5287bbc4efb024f6d38642")
        }
    })


    it('Fetch Proposal list with Genesis proposals', async () => {
        const society = await SocietyModel.fetch(1)
        const proposals = new ProposalCollection([],{})
        proposals.setSociety(society as SocietyModel)
        await proposals.fetch(wallet.sign().header(), true)    

        expect(proposals).not.to.eq(null)
        if (proposals){
            await proposals.fetchGenesisProposals()
            expect(proposals.count()).to.eq(3 + COUNT_DEFAULT_PROPOSALS)

            const proposal1 = proposals.sortByIndexAsc().nodeAt(0) as ProposalModel
            expect(proposal1.get().title()).to.eq("Genesis costs")
            expect(proposal1.get().index()).to.eq(1)
            expect(proposal1.get().layer()).to.eq("Economy")
            expect(proposal1.get().context()).to.eq(null)
            expect(proposal1.get().vote().get().closedAtLH()).to.eq(1)
            expect(proposal1.get().vote().get().approved()).to.eq(1)
            expect(proposal1.get().endAtLH()).to.eq(1)
            expect(proposal1.get().estimatedEndAtTime().toDateString()).to.eq(proposal1.get().createdAt().toDateString())

            expect(() => proposal1.get().costs()).to.not.throw(Error)
            expect(() => proposal1.get().constitution()).to.throw(Error)
            expect(proposal1.get().context()).to.eq(null)
            expect(proposal1.get().pubKH()).to.eq(proposal1.get().contentLink().get().output().get().contentPKH().toString('hex'))
            expect(proposal1.get().userVote()).to.eq(null)

            expect(proposal1.get().author().get().address()).eq('1111111111111111111111111111111111')
            expect(proposal1.get().author().get().username()).eq('involvera')

            expect(proposal1.get().costs().proposal).to.eq(BigInt(20000 * COIN_UNIT))
            expect(proposal1.get().costs().thread).to.eq(BigInt(1000 * COIN_UNIT))

            const proposal2 = proposals.sortByIndexAsc().nodeAt(1) as ProposalModel
            expect(proposal2.get().title()).to.eq("Genesis constitution")
            expect(proposal2.get().index()).to.eq(2)
            expect(proposal2.get().layer()).to.eq("Constitution")
            expect(proposal2.get().vote().get().closedAtLH()).to.eq(1)
            expect(proposal2.get().vote().get().approved()).to.eq(1)
            expect(proposal2.get().endAtLH()).to.eq(1)
            expect(proposal2.get().estimatedEndAtTime().toDateString()).to.eq(proposal2.get().createdAt().toDateString())

            expect(() => proposal2.get().costs()).to.throw(Error)
            expect(() => proposal2.get().constitution()).to.not.throw(Error)
            expect(proposal2.get().context()).to.eq(null)
            expect(proposal2.get().pubKH()).to.eq(proposal2.get().contentLink().get().output().get().contentPKH().toString('hex'))
            expect(proposal2.get().userVote()).to.eq(null)

            expect(proposal2.get().author().get().address()).eq('1111111111111111111111111111111111')
            expect(proposal2.get().author().get().username()).eq('involvera')

            const consti = proposal2.get().constitution()
            expect(consti[0].title == 'No constitution.')
            expect(consti[0].content == "No rules.")
        }
    })
    */

}

const timeout = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


main()