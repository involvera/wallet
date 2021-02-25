var BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
var bs58 = require('base-x')(BASE58)

export const DecodeBase58 = (data: string): Buffer => bs58.decode(data)
export const EncodeBase58 = (data: Buffer): string => bs58.encode(data)
