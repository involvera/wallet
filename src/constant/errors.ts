//Wallet
export const NOT_ENOUGH_FUNDS_ERROR = new Error("Not enough funds to perform this transaction")
export const WRONG_TX_BUILDER_STRUCTURE_ERROR = new Error("The transaction builder structure must contain the same amount of public key hashed (To), required amounts (AmountRequired), kinds (Kinds) and targets (Ta).")
export const LAST_CCH_NOT_FOUND_ERROR = new Error("Last CCH is not stored locally: not found.")
export const CANT_SEND_0_VALUE = new Error("You can't send 0 value.")
export const MAX_IS_2_POW_53 = new Error("Value in one input can't excess more than 9,007,199,254,740,992")