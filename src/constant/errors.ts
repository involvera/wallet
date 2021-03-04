import { MAX_CONSTITUTION_RULE } from "./crypto"

//Wallet
export const NOT_ENOUGH_FUNDS_ERROR = new Error("Not enough funds to perform this transaction")
export const WRONG_TX_BUILDER_STRUCTURE_ERROR = new Error("The transaction builder structure must contain the same amount of public key hashed (To), required amounts (AmountRequired), kinds (Kinds) and targets (Ta).")
export const LAST_CCH_NOT_FOUND_ERROR = new Error("Last CCH is not stored locally: not found.")
// var PRIV_KEY_NOT_FOUND = errors.New("Private key not found in the wallet list.")
// var NOT_ENOUGH_FUNDS = errors.New("Not enough funds to perform this transaction")

export const MAX_IS_2_POW_53 = new Error("Value in one input can't excess more than 9,007,199,254,740,992")


//Script
export const WRONG_TX_HASH_FORMAT = new Error("The transaction hash has not the right format")
export const WRONG_PUBKH_FORMAT = new Error("The public key hashed has not the right format")
export const WRONG_CONSTITUTION_LENGTH = new Error("The constitution must contains " + MAX_CONSTITUTION_RULE + " rules.")