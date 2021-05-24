import { TByte } from "../constant"

export const OP_NULL = 0x00 //0
export const OP_CHECKSIG    = 0x14 // 20
export const OP_EQUALVERIFY = 0x15 // 21
export const OP_HASH160     = 0x16 // 22
export const OP_DUP         = 0x17 // 23
export const OP_CONTENT     = 0x18 // 24

export const OPCODE_LIST = [OP_NULL, OP_CHECKSIG, OP_EQUALVERIFY, OP_HASH160, OP_DUP, OP_CONTENT]

export const OpcodeToString = (code: TByte): string => {
	switch (code) {
	case OP_NULL:
		return "OP_NULL"
	case OP_CHECKSIG:
		return "OP_CHECKSIG"
	case OP_EQUALVERIFY:
		return "OP_EQUALVERIFY"
	case OP_HASH160:
		return "OP_HASH160"
	case OP_DUP:
		return "OP_DUP"
	case OP_CONTENT:
		return "OP_CONTENT"
	}
    return ''
}
