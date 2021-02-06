import { TByte } from '../constant/type'

export interface IOutput {
	input_indexes: TByte[][] 
	value:        TByte[]
	pub_key_hash:   TByte[]
	k:              TByte,
	ta:         TByte[][]
}