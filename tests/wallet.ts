import { expect } from 'chai';
import 'mocha';
import {config} from 'acey'
import LocalStorage from 'acey-node-store'
import { Content } from '../'

import { COIN_UNIT, LUGH_AMOUNT, MAX_SUPPLY_AMOUNT } from '../src/constant';
import { DecodeBaseUUID, EncodeBaseUUID, IsAddressValid, PubKeyHashFromAddress } from 'wallet-util';
import { Wallet } from '../src/wallet'
import { UnserializedPut } from '../src/wallet/puts';
import { Constitution } from 'wallet-script';
import { ContentLinkModel, OutputModel } from '../src/transaction';
import { ThreadModel, ProposalModel, SocietyModel, RuleModel, ThreadCollection, ProposalCollection } from '../src/off-chain';
import axios from 'axios';
import conf from '../src/config'
import { RewardSummaryModel } from '../src/transaction/reward-summary';
import { RewardPutModel } from '../src/wallet/puts/rewards';
import { IConstitutionProposalUnRaw, ICostProposal } from 'community-coin-types'
import { UserVoteModel } from '../src/off-chain/proposal/user-vote';

// conf.setRootAPIChainUrl('http://185.212.226.103:8080')
// conf.setRootAPIOffChainUrl('http://185.212.226.103:3020')

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

    it('[ONCHAIN] Wallet1 -> Check reward puts', () => {
        expect(wallet.myRewards().count()).to.eq(1)
        expect(wallet2.myRewards().count()).to.eq(0)
        const n1 = wallet.myRewards().nodeAt(0) as RewardPutModel
        
        expect(n1.get().pkh().get().sender()).to.eq("02e3f082896ebf8692a8c324362cd762b8f191d5")
        
        expect(n1.get().value().get().now()).to.eq(29938313913)
        expect(n1.get().value().get().atCreationTime()).to.eq(30000000000)
        
        expect(n1.get().extraData()).to.eq("reaction_2")
    })

    it('[ONCHAIN] Wallet1 -> Fetch and check UTXOS: ', () => {
        const CCHList = wallet.cch().get().list()
        const utxos = wallet.utxos().get().get()

        expect(utxos.totalMeltedValue(CCHList)).to.equal(11594360380420)
        expect(wallet.balance()).to.equal(11594360380420)
        expect(utxos.totalValue()).to.equal(BigInt(11615704225793))
        const list = utxos.requiredList(Number(MAX_SUPPLY_AMOUNT), CCHList)
        expect(list.count()).to.equal(7)
        expect(utxos.listUnFetchedTxHash().length).to.eq(7)
    });

    it('[ONCHAIN] Wallet -> Check reward summary data', async () => {
        await wallet.synchronize()
        expect(wallet.rewardSummary().count()).to.eq(1)
        const n1 = wallet.rewardSummary().find({thread_pkh: '50610124b1895156879f0f8fc90ade817bea6753'}) as RewardSummaryModel

        expect(n1.get().value()).eq(1800000004)
        expect(n1.get().reactionCount().get().countUpvote()).eq(4)
        expect(n1.get().reactionCount().get().cumulatedReactionCount()).eq(4)
    })

    it('Wallet1 -> Check Address: ', () => {
        expect(wallet.keys().get().address()).to.eq("1GHQu3CDZpPZGb6PmaBPP4sZNuT13sja1")
        expect(Buffer.compare(PubKeyHashFromAddress(wallet.keys().get().address()), wallet.keys().get().pubHash())).to.eq(0)
        expect(IsAddressValid(wallet.keys().get().address())).to.eq(true)
        expect(wallet.keys().get().mnemonic()).to.eq("film dirt damage apart carry horse enroll carry power prison flush bulb")
        const uuid = EncodeBaseUUID(wallet.keys().get().pubHash())
        expect(DecodeBaseUUID(uuid).toString('hex')).to.eq(wallet.keys().get().pubHashHex())
    })

    it('Wallet1 -> Check Costs: ', () => {
        expect(wallet.costs().get().thread()).to.eq(LUGH_AMOUNT / 200)
        expect(wallet.costs().get().proposal()).to.eq(LUGH_AMOUNT / 20)
    })


    it('[ONCHAIN] Wallet1 -> Fetch and check Puts: ', () => {
        expect(wallet.puts().count()).to.eq(5)
        expect(wallet.info().get().votePowerCount()).to.eq(11763937282229)
        expect(wallet.info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('14.705')
        const now = new Date()
        now.setTime(now.getTime() - (1000 * 86400 * 90))
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
            expect(wallet.balance()).to.eq(balanceBefore-total-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(6)
            expect(wallet2.puts().count()).to.eq(1)

            const lastPut1 = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut1.get().value().get().atCreationTime()).to.eq(total)
            expect(lastPut1.get().currentValue(wallet.cch().get().list())).to.eq(total)
            expect(lastPut1.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut1.get().pkh().get().recipient()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut1.get().txID()).to.eq(tx.get().hashHex())
            
            const lastPut2 = wallet2.puts().first() as UnserializedPut
            expect(lastPut2.get().value().get().atCreationTime()).to.eq(total)
            expect(lastPut2.get().currentValue(wallet2.cch().get().list())).to.eq(total)
            expect(lastPut2.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut2.get().pkh().get().recipient()).to.eq(wallet2.keys().get().pubHashHex())
            expect(lastPut2.get().txID()).to.eq(tx.get().hashHex())
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
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(7)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(Number(lastPut.get().value().get().atCreationTime())).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isApplicationProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 2/4', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })
    
    it('[OFFCHAIN] Wallet1 -> create a proposal: application failed 3/4', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of an application proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
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
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            expect(wallet.puts().count()).to.eq(8)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().value().get().atCreationTime()).to.eq(wallet.costs().get().proposal()+2)
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isConstitutionProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal constitution failed 1/1', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a constitution proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal constitution content', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a constitution proposal", ["Content 1: %[proposal/8]", "Content 2: %[involvera/proposal/8]", "Content 3: %[https://involvera.com/involvera/proposal/8]"])
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
            const out = tx.get().outputs().nodeAt(0) as OutputModel
            uuidContent = out.get().contentUUID()
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().proposal()-tx.get().fees(wallet.fees().get().feePerByte()) - 2)
            expect(wallet.puts().count()).to.eq(9)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().value().get().atCreationTime()).to.eq(wallet.costs().get().proposal())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isProposal()).to.eq(true)
            expect(lastPut.isCostProposal() ).to.eq(true)
            expect(lastPut.get().contentPKH()).to.not.eq("")
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal cost content failed 1/1', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a cost proposal", ["Content 1", "Content 2", "Content 3", "Content 4"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(406)
        expect(res.data.error).to.eq("Wrong length of content.")
    })

    it('[OFFCHAIN] Wallet1 -> create a proposal cost content', async () => {
        const p = ProposalModel.NewContent(1, "This is the title of a cost proposal", ["Content 1: %[proposal/8]\n%[https://involvera.com/involvera/proposal/9]", "Content 2: %[involvera/proposal/8]\n%[proposal/9]", "Content 3: %[https://involvera.com/involvera/proposal/8]\n%[involvera/proposal/9]"])
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet1 -> create a vote', async () => {
        const proposal = await ContentLinkModel.FetchProposal(uuidContent)
        const tx = await wallet.buildTX().vote(proposal, true)
        const balance = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(10)
            expect(wallet.balance()).to.eq(balance-1-tx.get().fees(wallet.fees().get().feePerByte())-1)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().value().get().atCreationTime()).to.eq(1)
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isVote()).to.eq(true)
            expect(lastPut.isAcceptedVote()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq("")
            expect(lastPut.get().contentPKHTargeted()).to.eq(proposal.get().link().get().output().get().contentPKH().toString('hex'))
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
            uuidContent = out.get().contentUUID()
            pkhContent0 = out.get().contentPKH().toString('hex')
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(11)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-2)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().value().get().atCreationTime()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(false)
            expect(lastPut.get().contentUUID()).to.eq(uuidContent)
            expect(lastPut.get().contentPKHTargeted()).to.eq("")
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a thread', async () => {
        const p = ThreadModel.NewContent(1, "This is a title.", "Here are the 3 proposals I like:\n1. %[proposal/8]\n2. %[involvera/proposal/9]\n3. %[https://involvera.com/involvera/proposal/10]")
        const res = await p.broadcast(wallet.keys().get().contentWallet(wallet.info().get().contentNonce()))
        expect(res.status).to.eq(201)
        await timeout(1000)
    })

    let pkhContent2 = ""
    it('[ONCHAIN] Wallet1 -> create a rethread', async () => {
        const thread = await ContentLinkModel.FetchThread(uuidContent)
        const tx = await wallet.buildTX().rethread(thread)
        const balance = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            const out = tx.get().outputs().nodeAt(0) as OutputModel
            pkhContent2 = out.get().contentPKH().toString('hex')
            expect(response.status).to.eq(201)
            expect(wallet.puts().count()).to.eq(12)
            expect(wallet.balance()).to.eq(balance-wallet.costs().get().thread()-tx.get().fees(wallet.fees().get().feePerByte())-1)
            const lastPut = wallet.puts().sortByTime().first() as UnserializedPut
            expect(lastPut.get().value().get().atCreationTime()).to.eq(wallet.costs().get().thread())
            expect(lastPut.get().pkh().get().sender()).to.eq(wallet.keys().get().pubHashHex())
            expect(lastPut.isThread()).to.eq(true)
            expect(lastPut.isRethread()).to.eq(true)
            expect(lastPut.get().contentPKH()).to.eq(pkhContent2)
            expect(lastPut.get().contentPKHTargeted()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))
        }
    })

    it('[OFFCHAIN] Wallet1 -> create a rethread', async () => {
        const p = ThreadModel.NewContent(1, "This is a title.", `Here my favorite Thread: %[thread/${pkhContent0}] \n and these are the 3 proposals I like:\n1. %[proposal/8]\n2. %[involvera/proposal/9]\n3. %[https://involvera.com/involvera/proposal/10]`)
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
        const thread = await ContentLinkModel.FetchThread(uuidContent)
        const tx = await wallet2.buildTX().reward(thread, 'upvote')        
        const balance = wallet2.balance()
        const balance2 = wallet.balance()
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet.synchronize()
            expect(wallet2.puts().count()).to.eq(1)
            expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().upvote()-tx.get().fees(wallet2.fees().get().feePerByte())-1)

            expect(balance2).to.eq(wallet.balance()-(wallet.costs().get().upvote() * 0.3)-1)
            expect(wallet.puts().count()).to.eq(12)

            expect(wallet2.myRewards().count()).to.eq(1)
            const n1 = wallet2.myRewards().nodeAt(0) as RewardPutModel
            
            expect(n1.get().pkh().get().sender()).to.eq(wallet2.keys().get().pubHashHex())
            expect(n1.get().pkh().get().recipient()).to.eq(wallet.keys().get().pubHashHex())
            
            expect(n1.get().extraData()).to.eq("upvote")
            expect(n1.get().link().get().to()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))

            expect(n1.get().value().get().now()).to.eq((wallet.costs().get().upvote() * 0.3) + 1)
            expect(n1.get().value().get().atCreationTime()).to.eq((wallet.costs().get().upvote() * 0.3) + 1) 
        }
    })

    it('[ONCHAIN] Wallet2 -> create a reward : reaction0', async () => {
        const thread = await ContentLinkModel.FetchThread(pkhContent2)
        const tx = await wallet2.buildTX().reward(thread, 'reaction0')
        const balance = wallet2.balance()
        const balance2 = wallet.balance()
        expect(tx).not.eq(null)

        if (tx){
            const response = await tx.broadcast(wallet2)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet.synchronize()
            expect(wallet2.puts().count()).to.eq(1)
            expect(wallet2.balance()).to.eq(balance-wallet2.costs().get().reaction0()-tx.get().fees(wallet2.fees().get().feePerByte())-1)

            expect(wallet2.myRewards().count()).to.eq(2)
            const n1 = wallet2.myRewards().nodeAt(1) as RewardPutModel
            
            expect(n1.get().pkh().get().sender()).to.eq(wallet2.keys().get().pubHashHex())
            expect(n1.get().pkh().get().recipient()).to.eq(wallet.keys().get().pubHashHex())
            
            expect(n1.get().extraData()).to.eq("reaction_0")
            expect(n1.get().link().get().to()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))

            expect(n1.get().value().get().now()).to.eq((wallet.costs().get().reaction0() * 0.3) + 1)
            expect(n1.get().value().get().atCreationTime()).to.eq((wallet.costs().get().reaction0() * 0.3) + 1)
        }
    })

    it('[ONCHAIN] Wallet -> Check reward summary data', async () => {
        expect(wallet.rewardSummary().count()).to.eq(3)
        const n1 = wallet.rewardSummary().find({thread_pkh: '2c108813b0f957c5776dffec80c5122b4e782864'}) as RewardSummaryModel
        const n2 = wallet.rewardSummary().find({thread_pkh: '50610124b1895156879f0f8fc90ade817bea6753'}) as RewardSummaryModel
        const n3 = wallet.rewardSummary().find({thread_pkh: 'af53ae357d42b460838f4f4157cd579de0f9d6fd'}) as RewardSummaryModel

        expect(n1.get().value()).eq(1800000001)
        expect(n1.get().reactionCount().get().cumulatedReactionCount()).eq(1)

        expect(n2.get().value()).eq(1800000004)
        expect(n2.get().reactionCount().get().cumulatedReactionCount()).eq(4)

        expect(n3.get().value()).eq(450000001)
        expect(n3.get().reactionCount().get().cumulatedReactionCount()).eq(1)
    })

    it('[ONCHAIN] Wallet1 -> Check puts:', () => {
        expect(wallet.puts().count()).to.eq(12)
        expect(wallet.info().get().votePowerCount()).to.eq(11763937282229)
        expect(wallet.info().get().votePowerPercent(wallet.cch().get().lastHeight()).toFixed(3)).to.eq('14.705')
        const now = new Date()
        now.setTime(now.getTime() - (1000 * 86400 * 90))
        // expect(wallet.puts().get().totalReceivedDonationSince(now, wallet.keys().get().pubHashHex())).to.eq(BigInt(4050000006))
    })

    it('[ONCHAIN] Wallet1 -> Check Vote power distribution on Puts.', () => {
        expect(wallet.puts().get().votePowerDistribution().count()).to.eq(3)
    })

    it('[ONCHAIN] Wallet1 sends some coins to Wallet3 ', async () => {
        const costs = wallet.costs().get()
        const total = costs.reaction0() + costs.reaction1() + costs.reaction2() * 2 + costs.upvote() 
        const tx = await wallet.buildTX().toAddress(wallet3.keys().get().address(), total)
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet)
            expect(response.status).to.eq(201)
            await wallet3.synchronize()
        }
    })

    it('[OFFCHAIN] Create an alias on Wallet 3', async () => {
        const alias = wallet3.keys().get().alias()
        alias.setUsername('wallet3')
        const res = await alias.update(wallet3.keys().get().wallet())
        expect(res.status).to.eq(201)
    })

    it('[ONCHAIN] Wallet3 -> create a reward : reaction0', async () => {
        const thread = await ContentLinkModel.FetchThread(pkhContent2)
        const tx = await wallet3.buildTX().reward(thread, 'reaction0')
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet3)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet3.synchronize()

            const n1 = wallet3.myRewards().nodeAt(0) as RewardPutModel
            
            expect(n1.get().pkh().get().sender()).to.eq(wallet3.keys().get().pubHashHex())
            expect(n1.get().pkh().get().recipient()).to.eq(wallet.keys().get().pubHashHex())
            
            expect(n1.get().extraData()).to.eq("reaction_0")
            expect(n1.get().link().get().to()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))

            expect(n1.get().value().get().now()).to.eq((wallet.costs().get().reaction0() * 0.3) + 1)
            expect(n1.get().value().get().atCreationTime()).to.eq((wallet.costs().get().reaction0() * 0.3) + 1)
        }
    })

    it('[ONCHAIN] Wallet3 -> create a reward : reaction1', async () => {
        const thread = await ContentLinkModel.FetchThread(pkhContent2)
        const tx = await wallet3.buildTX().reward(thread, 'reaction1')
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet3)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet3.synchronize()

            const n1 = wallet3.myRewards().nodeAt(1) as RewardPutModel
            
            expect(n1.get().pkh().get().sender()).to.eq(wallet3.keys().get().pubHashHex())
            expect(n1.get().pkh().get().recipient()).to.eq(wallet.keys().get().pubHashHex())
            
            expect(n1.get().extraData()).to.eq("reaction_1")
            expect(n1.get().link().get().to()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))

            expect(n1.get().value().get().now()).to.eq((wallet.costs().get().reaction1() * 0.3))
            expect(n1.get().value().get().atCreationTime()).to.eq((wallet.costs().get().reaction1() * 0.3))
        }
    })

    it('[ONCHAIN] Wallet3 -> create a reward : reaction2', async () => {
        const thread = await ContentLinkModel.FetchThread(pkhContent2)
        const tx = await wallet3.buildTX().reward(thread, 'reaction2')
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet3)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet3.synchronize()

            const n1 = wallet3.myRewards().nodeAt(2) as RewardPutModel
            
            expect(n1.get().pkh().get().sender()).to.eq(wallet3.keys().get().pubHashHex())
            expect(n1.get().pkh().get().recipient()).to.eq(wallet.keys().get().pubHashHex())
            
            expect(n1.get().extraData()).to.eq("reaction_2")
            expect(n1.get().link().get().to()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))

            expect(n1.get().value().get().now()).to.eq((wallet.costs().get().reaction2() * 0.3))
            expect(n1.get().value().get().atCreationTime()).to.eq((wallet.costs().get().reaction2() * 0.3))
        }
    })

    it('[ONCHAIN] Wallet3 -> create a reward : upvote', async () => {
        const thread = await ContentLinkModel.FetchThread(pkhContent2)
        const tx = await wallet3.buildTX().reward(thread, 'upvote')
        expect(tx).not.eq(null)
        if (tx){
            const response = await tx.broadcast(wallet3)
            expect(response.status).to.eq(201)
            lastReaction = {tx_id: tx.get().hashHex(), vout: 0}
            await wallet3.synchronize()

            const n1 = wallet3.myRewards().nodeAt(3) as RewardPutModel
            
            expect(n1.get().pkh().get().sender()).to.eq(wallet3.keys().get().pubHashHex())
            expect(n1.get().pkh().get().recipient()).to.eq(wallet.keys().get().pubHashHex())
            
            expect(n1.get().extraData()).to.eq("upvote")
            expect(n1.get().link().get().to()).to.eq(thread.get().link().get().output().get().contentPKH().toString('hex'))

            expect(n1.get().value().get().now()).to.eq((wallet.costs().get().upvote() * 0.3) + 1)
            expect(n1.get().value().get().atCreationTime()).to.eq((wallet.costs().get().upvote() * 0.3) + 1)
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

    it('[ONCHAIN] Wallet -> Check reward summary data', async () => {
        await wallet.synchronize()
        expect(wallet.rewardSummary().count()).to.eq(3)
        const n1 = wallet.rewardSummary().find({thread_pkh: '2c108813b0f957c5776dffec80c5122b4e782864'}) as RewardSummaryModel
        const n2 = wallet.rewardSummary().find({thread_pkh: '50610124b1895156879f0f8fc90ade817bea6753'}) as RewardSummaryModel
        const n3 = wallet.rewardSummary().find({thread_pkh: 'af53ae357d42b460838f4f4157cd579de0f9d6fd'}) as RewardSummaryModel

        expect(n1.get().value()).eq(41550000003)
        expect(n1.get().reactionCount().get().cumulatedReactionCount()).eq(5)
        expect(n1.get().reactionCount().get().countUpvote()).eq(1)
        expect(n1.get().reactionCount().get().countReward0()).eq(2)
        expect(n1.get().reactionCount().get().countReward1()).eq(1)
        expect(n1.get().reactionCount().get().countReward2()).eq(1)
        
        expect(n2.get().value()).eq(1800000004)
        expect(n2.get().reactionCount().get().cumulatedReactionCount()).eq(4)
        expect(n2.get().reactionCount().get().countUpvote()).eq(4)
        expect(n2.get().reactionCount().get().countReward0()).eq(0)
        expect(n2.get().reactionCount().get().countReward1()).eq(0)
        expect(n2.get().reactionCount().get().countReward2()).eq(0)

        expect(n3.get().value()).eq(450000001)
        expect(n3.get().reactionCount().get().cumulatedReactionCount()).eq(1)
        expect(n3.get().reactionCount().get().countUpvote()).eq(1)
        expect(n3.get().reactionCount().get().countReward0()).eq(0)
        expect(n3.get().reactionCount().get().countReward1()).eq(0)
        expect(n3.get().reactionCount().get().countReward2()).eq(0)
    })

    it('Fetch Thread list', async () => {
        const threads = await ThreadCollection.FetchLastThreads(1, 0)
        expect(threads).not.to.eq(null)
        if (threads){
            expect(threads.count()).to.eq(2)
            const thread1 = threads.nodeAt(0) as ThreadModel
            const thread2 = threads.nodeAt(1) as ThreadModel

            expect(thread1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread1.get().title()).to.eq("This is a title.")
            expect(thread1.get().pubKH()).to.eq("2c108813b0f957c5776dffec80c5122b4e782864")
            expect(thread1.get().contentLink().get().targetContent()).to.eq("af53ae357d42b460838f4f4157cd579de0f9d6fd")
            expect(thread1.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread1.get().rewards().get().countUpvote()).to.eq(1)
            expect(thread1.get().rewards().get().countReward0()).to.eq(2)
            expect(thread1.get().rewards().get().countReward1()).to.eq(1)
            expect(thread1.get().rewards().get().countReward2()).to.eq(1)
            const fullThread1 = await ThreadModel.FetchByPKH(1, thread1.get().pubKH())
            if (fullThread1){
                expect(fullThread1.get().content()).to.eq("Here my favorite Thread: %[thread/af53ae357d42b460838f4f4157cd579de0f9d6fd] \n and these are the 3 proposals I like:\n1. %[proposal/8]\n2. %[involvera/proposal/9]\n3. %[https://involvera.com/involvera/proposal/10]")
                expect(fullThread1.get().embeds().length).to.eq(4)
            }

            expect(thread2.get().author().get().address()).eq(wallet.keys().get().address())
            expect(thread2.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(thread2.get().title()).to.eq("This is a title.")
            expect(thread2.get().pubKH()).to.eq("af53ae357d42b460838f4f4157cd579de0f9d6fd")
            expect(thread2.get().contentLink().get().targetContent()).to.eq("")
            expect(thread2.get().contentLink().get().output().get().value()).to.eq(BigInt(50103021979))
            expect(thread2.get().rewards().get().countUpvote()).to.eq(1)
            expect(thread2.get().rewards().get().countReward0()).to.eq(0)
            expect(thread2.get().rewards().get().countReward1()).to.eq(0)
            expect(thread2.get().rewards().get().countReward2()).to.eq(0)
            const fullThread2 = await ThreadModel.FetchByPKH(1, thread2.get().pubKH())
            if (fullThread2){
                expect(fullThread2.get().content()).to.eq("Here are the 3 proposals I like:\n1. %[proposal/8]\n2. %[involvera/proposal/9]\n3. %[https://involvera.com/involvera/proposal/10]")
                expect(fullThread2.get().embeds().length).to.eq(3)
            }
        }
    })

    it('Fetch Proposal list', async () => {
        const proposals = await ProposalCollection.FetchLastProposals(1, 0, wallet.sign().header())
        expect(proposals).not.to.eq(null)
        if (proposals){
            await proposals.pullUserVotes(wallet.sign().header())
            expect(proposals.count()).to.eq(3)
            const proposal1 = proposals.nodeAt(0) as ProposalModel
            const proposal2 = proposals.nodeAt(1) as ProposalModel
            const proposal3 = proposals.nodeAt(2) as ProposalModel

            expect(proposal1.get().author().get().address()).eq(wallet.keys().get().address())
            expect(proposal1.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(proposal1.get().title()).to.eq("This is the title of a cost proposal")
            expect(proposal1.get().pubKH()).to.eq("ee8a1440725029994a56a1d7d7ecb28140fb4fb0")
            expect(proposal1.get().index()).to.eq(10)
            expect(proposal1.get().layer()).to.eq("Economy")
            expect(proposal1.get().costs().proposal).to.eq(BigInt(2000 * COIN_UNIT))
            expect(proposal1.get().costs().thread).to.eq(BigInt(-1))
            expect(proposal1.get().context()).to.eq(null)
            expect(proposal1.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal1.get().vote().get().approved()).to.eq(-1)
            expect(proposal1.get().embeds().length).to.eq(0)
            expect(proposal1.get().endAtLH()).to.eq(28)
            const userVote = proposal1.get().userVote() as UserVoteModel
            expect(userVote.get().hasApproved()).to.eq(true)
            expect(userVote.get().voteLH()).to.eq(8)
            const fullProposal1 = await ProposalModel.FetchByIndex(1, 10, wallet.sign().header())
            if (fullProposal1){
                const context = fullProposal1.get().context()
                expect((context as ICostProposal).proposal).to.eq(500000000000)
                expect((context as ICostProposal).thread).to.eq(50000000000)

                const content = fullProposal1.get().content()
                expect(fullProposal1.get().embeds().length).to.eq(2)
                expect(content.length).to.eq(3)
                expect(content[0]).to.eq("Content 1: %[proposal/8]\n%[https://involvera.com/involvera/proposal/9]")
                expect(content[1]).to.eq("Content 2: %[involvera/proposal/8]\n%[proposal/9]")
                expect(content[2]).to.eq("Content 3: %[https://involvera.com/involvera/proposal/8]\n%[involvera/proposal/9]")
            }
            expect(proposal2.get().author().get().address()).eq(wallet.keys().get().address())
            expect(proposal2.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(proposal2.get().title()).to.eq("This is the title of a constitution proposal")
            expect(proposal2.get().pubKH()).to.eq("56c1544ea85a2065c3ff2019f1786912ef5d599f")
            expect(proposal2.get().index()).to.eq(9)
            expect(proposal2.get().layer()).to.eq("Constitution")
            expect(proposal2.get().constitution()[0].content).to.eq("Content #0")
            expect(proposal2.get().constitution()[0].title).to.eq("Title #0")
            expect(proposal2.get().context()).to.eq(null)
            expect(proposal2.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal2.get().vote().get().approved()).to.eq(-1)
            expect(proposal2.get().embeds().length).to.eq(0)
            expect(proposal2.get().endAtLH()).to.eq(28)
            expect(proposal2.get().userVote()).to.eq(null)

            const fullProposal2 = await ProposalModel.FetchByIndex(1, 9, wallet.sign().header())
            if (fullProposal2){
                const content = fullProposal2.get().content()
                expect(fullProposal2.get().embeds().length).to.eq(1)
                expect(content.length).to.eq(3)
                const context = fullProposal2.get().context()
                expect((context as IConstitutionProposalUnRaw).constitution.length).to.eq(10)
                expect(content[0]).to.eq("Content 1: %[proposal/8]")
                expect(content[1]).to.eq("Content 2: %[involvera/proposal/8]")
                expect(content[2]).to.eq("Content 3: %[https://involvera.com/involvera/proposal/8]")
            }
            expect(proposal3.get().author().get().address()).eq(wallet.keys().get().address())
            expect(proposal3.get().author().get().username()).eq(wallet.keys().get().alias().get().username())
            expect(proposal3.get().title()).to.eq("This is the title of an application proposal")
            expect(proposal3.get().pubKH()).to.eq("d9ea8f0f43aa29a263ab036e42203305c48ab33b")
            expect(proposal3.get().index()).to.eq(8)
            expect(proposal3.get().layer()).to.eq("Application")
            expect(proposal3.get().context()).to.eq(null)
            expect(proposal3.get().vote().get().closedAtLH()).to.eq(28)
            expect(proposal3.get().vote().get().approved()).to.eq(-1)
            expect(proposal3.get().embeds().length).to.eq(0)
            expect(proposal3.get().endAtLH()).to.eq(28)
            expect(proposal3.get().userVote()).to.eq(null)

            const fullProposal3 = await ProposalModel.FetchByIndex(1, 8, wallet.sign().header())
            if (fullProposal3){
                expect(fullProposal3.get().embeds().length).to.eq(0)
                expect(fullProposal3.get().context()).to.eq(null)
                const content = fullProposal3.get().content()
                expect(content.length).to.eq(4)
                expect(content[0]).to.eq("Content 1")
                expect(content[1]).to.eq("Content 2")
                expect(content[2]).to.eq("Content 3")
                expect(content[3]).to.eq("Content 4")
            }
        }
    })
}

const timeout = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


main()