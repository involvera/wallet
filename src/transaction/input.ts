import { TByte } from '../constant/type'

export interface IInput {
    prev_transaction_hash: TByte[]
    vout: TByte[]
    sign: TByte[]
}