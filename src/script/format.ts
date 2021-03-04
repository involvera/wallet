import { CODES_WITH_PUBKH, CODES_WITH_TXID, CODES_WITH_TXID_AND_PUBKH, PAYING_CODES, TCodeSort, WRITING_CODES } from './constant'

export const CodesWithPubKHBytesArray = (): Buffer => {
    return codesMapToBytesArray(CODES_WITH_PUBKH)
}

export const CodesWithTxIDBytesArray = (): Buffer => {
    return codesMapToBytesArray(CODES_WITH_TXID)
}

export const PayingCodesBytesArray = (): Buffer => {
    return codesMapToBytesArray(PAYING_CODES)
}

export const WritingCodesBytesArray = (): Buffer => {
    return codesMapToBytesArray(WRITING_CODES)
}

export const CodesWithTxIDAndPubKHBytesArray = (): Buffer => {
    return codesMapToBytesArray(CODES_WITH_TXID_AND_PUBKH)
}

const codesMapToBytesArray = (list: TCodeSort): Buffer => {
    let ret = Buffer.from([])
    for (const key in list){
        ret = Buffer.concat([ ret, Buffer.from([ list[key] ]) ])
    }
    return ret
}
