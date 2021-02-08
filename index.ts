import {config  } from 'acey'
import LocalStorage from 'acey-node-store'

import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import { ByteArrayToInt, ByteArrayToString, Sha256, StringToByteArray, B64ToBigInt, B64ToByteArray } from './src/util'
import ecdsa from 'tiny-secp256k1'
import { bs58 } from './src/util/basen'
import { UTXOList, UTXO } from './src/transaction/utxo'

const main = async () => {
    config.setStoreEngine(new LocalStorage('./db'))
    await config.done()

    let serialized = "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"

    const data = JSON.parse(bs58.decode(serialized).toString())
    const utxos = new UTXOList(data, {})
    
    // const o = JSON.parse((Buffer.from(bs58.decode(serialized))).toString())
    // const utxos = new UTXOList(o, {})
    // console.log(JSON.stringify(o))
    // console.log((utxos.nodeAt(0) as UTXO).output().getValueBigInt())
    // console.log(o)

    // console.log(ByteArrayToString(bs58.decode(serialized)))
    // const list = new UTXOS(UTXOS.deserialize(bs58.decode(serialized)), {key: 'utxos'})
    // console.log(list.to().string())

    // const mnemonic = bip39.generateMnemonic()
    // const seed = await bip39.mnemonicToSeed(mnemonic, "")
    // const p = bip32.fromSeed(seed)
    
    // const sha = createHash('sha256').update(StringToByteArray("1")).digest()
    // console.log(bs58.encode(Sha256("1")))

    // const signed = p.sign(Buffer.from(Sha256('05/02/2020')))
    // console.log(signed)
    // const signature = ecdsa.sign(Buffer.from(Sha256('05/02/2020')), p.privateKey as Buffer)
    // console.log(ecdsa.verify(Buffer.from(Sha256('05/02/2020')), p.publicKey, signature))
}

main()
