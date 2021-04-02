import { PUBKH_LENGTH, TXID_LENGTH } from "../constant"

export const IsPubKHRightFormat = (pubkh: Buffer) => {
    return pubkh.length === PUBKH_LENGTH
}

export const IsTxHashRightFormat = (hash: Buffer) => {
    return hash.length === TXID_LENGTH
}

export const IsUUID = (uuid: string) => { 
    return uuid.length > 32
}