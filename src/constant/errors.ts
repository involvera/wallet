import { MAX_CONSTITUTION_RULE } from "./crypto"

//Wallet
export const NOT_ENOUGH_FUNDS_ERROR = new Error("Not enough funds to perform this transaction")
export const WRONG_TX_BUILDER_STRUCTURE_ERROR = new Error("The transaction builder structure must contain the same amount of public key hashed (To), required amounts (AmountRequired), kinds (Kinds) and targets (Ta).")
export const LAST_CCH_NOT_FOUND_ERROR = new Error("Last CCH is not stored locally: not found.")
export const CANT_SEND_0_VALUE = new Error("You can't send 0 value.")
export const MAX_IS_2_POW_53 = new Error("Value in one input can't excess more than 9,007,199,254,740,992")

//Script
export const WRONG_TX_HASH_FORMAT = new Error("The transaction hash has not the right format")
export const WRONG_PUBKH_FORMAT = new Error("Not a public key hashed")
export const WRONG_PUBK_FORMAT = new Error("Not a public key")
export const WRONG_CONSTITUTION_LENGTH = new Error("The constitution must contains " + MAX_CONSTITUTION_RULE + " rules.")
export const NO_CONTENT_NONCE = new Error("No content nonce for this kind of content")
export const WRONG_LOCK_SCRIPT = new Error("Wrong lock script")
export const NOT_A_TARGETABLE_CONTENT = new Error("Not a targetable content")
export const NOT_A_TARGETING_CONTENT = new Error("Not a targeting content")
export const NOT_A_CONSTITUTION_PROPOSAL = new Error("Not a constitution proposal script content")
export const NOT_A_COST_PROPOSAL = new Error("Not a cost proposal script")
export const NOT_A_LOCK_SCRIPT = new Error("Not a lock script")
export const NOT_A_REWARD_SCRIPT = new Error("Not a reward script")