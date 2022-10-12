import { Inv } from "wallet-util"

export const COIN_UNIT = new Inv.InvBigInt(100_000_000)
export const LUGH_AMOUNT = COIN_UNIT.mul(100_000)
export const CYCLE_IN_LUGH = 1_459
export const MAX_SUPPLY_AMOUNT = LUGH_AMOUNT.mul(CYCLE_IN_LUGH)
export const BURNING_RATIO = 0.7
export const LUGH_EVERY_N_S = 8 * 3_600
export const N_LUGH_VOTE_DURATION = 20
export const COUNT_DEFAULT_PROPOSALS = 2