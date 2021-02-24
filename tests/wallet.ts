import { expect } from 'chai';
import 'mocha';
import { MAX_SUPPLY_AMOUNT } from '../src/constant';

import Wallet from '../src/wallet/wallet'

const data = `{"seed":{"seed":"fdeb4f090877932589bbb8837a8cf74acb63f63608af8de78bc404a51d02a961fdbaa9f0deb9f52c1e017fb61b97539fe4fc8ee84252c7d59ede1652eb7bcbb1"},"utxos":[{"tx_id":"72b836679167093e13dde61cb8d1c397dce98a082769fb69306d153e7d8614cc","idx":50,"output":{"input_indexes":null,"value":178571428571,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":1,"cch":"1614089031540313","tx":null},{"tx_id":"23080f594dccee86cebcd2637344cd7f1b4985cc3f002976841bda4dda5438ac","idx":3,"output":{"input_indexes":null,"value":1433032616219,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":1,"cch":"1614089031529697","tx":null},{"tx_id":"ee11d7e6e5a94d5ec6cbb9663b5c86f84163202edd74789d49e9a6c658f2752e","idx":1,"output":{"input_indexes":[0],"value":450000001,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":1,"cch":"1614089028197073","tx":null},{"tx_id":"b66cb7a858b64af4b021d710b907c4ecc5efe743bfe5ab7ec17d94e07205533f","idx":1,"output":{"input_indexes":[0],"value":450000001,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":1,"cch":"1614089028197073","tx":null},{"tx_id":"b68bd15263ba3a98d3de7b73206020b1f07d56036b361b54aafe2a90d4a26017","idx":1,"output":{"input_indexes":[0],"value":450000001,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":1,"cch":"1614089028197073","tx":null},{"tx_id":"84e427319b458efc2fea2531b50cb31e2a4d71febda8ddadd2a5cb54e9654c5c","idx":1,"output":{"input_indexes":[0],"value":451237115,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":0.9972583961617546,"cch":"1614089028197073","tx":null},{"tx_id":"d47e234beaeba08e4688ead4844d7eb1c8e241db59d2bf3f2ac531be91cd0bfe","idx":1,"output":{"input_indexes":[0],"value":9849965706446,"pub_key_hash":"dc1c63f1c46ba70d3d94abdd572c5c54a641316b","k":0,"ta":[]},"mr":0.9993145990404386,"cch":"1614089028197073","tx":null}],"cch_list":["1614089031540313","1614089031529697","1614089028197073","1614089023764861","1614089020008792","1614089019809597","1614089019691845","1614089019644032","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],"contract":{"value":"13LnUf4t","next_change":1613684544},"fees":{"fee_per_byte":1000000,"to_pkh_hex":"03086678ea8cc4ef2d471398d92da06b67cd1415ad318bed53477623aecc779e5a"},"costs":{"thread":50000000000,"proposal":500000000000,"upvote":1500000000,"reaction_0":6000000000,"reaction_1":25000000000,"reaction_2":100000000000,"P":null}}`

const wallet = new Wallet(JSON.parse(data), {})

describe('Testing wallets methods', () => {

    it('UTXOS: ', () => {
        const CCHList = wallet.cch().get()
        const utxos = wallet.utxos().get().get()

        expect(utxos.totalMeltedValue(CCHList)).to.equal(11442131552328)
        expect(utxos.totalValue()).to.equal(BigInt(11463370988354))
        const list = utxos.requiredList(Number(MAX_SUPPLY_AMOUNT), CCHList)
        expect(list.count()).to.equal(7)
        expect(utxos.listUnFetchedTxHash().length).to.eq(7)
    });


})