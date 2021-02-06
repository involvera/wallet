import { TByte } from '../constant/type'

const MAX_UINT_8 = BigInt(256)
const MAX_UINT_16 = BigInt(65536)
const MAX_UINT_32 = BigInt(4294967296)
const MAX_UINT_64 = BigInt(18446744073709551616)

const TWO = BigInt(2)
const ONE = BigInt(1)
const ZERO = BigInt(0)
const MINUS = BigInt(-1)

export const StringToByteArray = (str: string): TByte[] => {
    let utf8 = [];
    for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6),
                      0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18),
                      0x80 | ((charcode>>12) & 0x3f),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f));
        }
    }
    return utf8 as TByte[]
}

export const ByteArrayToString = (array: TByte[]): string => {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
    c = array[i++];
    switch(c >> 4)
    { 
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                       ((char2 & 0x3F) << 6) |
                       ((char3 & 0x3F) << 0));
        break;
    }
    }

    return out;
}

export const ByteArrayToInt = (value: TByte[], isNegative: boolean) => {
    let binaryStr = '';

    let MAX = MAX_UINT_8
    switch(value.length){
        case 1:
            MAX = MAX_UINT_8
        case 2:
            MAX = MAX_UINT_16
        case 4:
            MAX = MAX_UINT_32
        case 8:
            MAX = MAX_UINT_64
    }

    for (let i = 0; i < value.length; i++) {
        binaryStr = value[i].toString(2) + binaryStr
    }

    let n = BigInt(0)
    let currentBinaryVal = BigInt(1)
    for (let i = binaryStr.length - 1; i >= 0; i--){
        if (binaryStr.charAt(i) == '1'){
            n += currentBinaryVal
        }
        currentBinaryVal *= TWO
    }

    if (isNegative) {
        n -= MAX 
    }
    return n
}

export const AreEqual = (a1: TByte[], a2: TByte[]) => {
    if (a1.length != a2.length){
        return false
    }
    for (let i =0; i < a1.length; i++){
        if (a1[i] != a2[i]){
            return false
        }
    }
    return true
} 

export const DecodeArrayInt = (array: TByte[][]): BigInt[] => {
    let ret: BigInt[] = []
    for (let i = 0; i < array.length; i++) {
        ret[i] = ByteArrayToInt(array[i], false)
    }
    return ret
} 

export const IntToByteArray = (val: BigInt) => {
    return intToByteArray(val, 'int32', false)
}

export const Int64ToByteArray = (val: BigInt) => {
    return intToByteArray(val, 'int64', false)
}

const intToByteArray = (val: BigInt, valType: 'int8' | 'int16' | 'int32' | 'int64', isUnsigned: boolean) => {
    const M = {'int8': MAX_UINT_8, 'int16': MAX_UINT_16, 'int32': MAX_UINT_32, 'int64': MAX_UINT_64}[valType]
    const N_BYTE = {'int8': 8, 'int16': 16, 'int32': 32, 'int64': 64}[valType]
    const CURRENT_MIN_INT = (M / TWO) * MINUS
    const CURRENT_MAX_INT = (M / TWO) - ONE

     if (!isUnsigned && (val < CURRENT_MIN_INT || val > CURRENT_MAX_INT)){
        throw new Error("overflow")
    } else if (isUnsigned && (val < ZERO || val > ((CURRENT_MAX_INT * TWO) + ONE))){
        throw new Error("unsigned overflow")
    }

    var ret: TByte[] = []
    if (val < ZERO) {
        val = ((CURRENT_MAX_INT+ONE) * TWO) + BigInt(val)
    }

    let binary = val.toString(2);
    const length = N_BYTE - binary.length
    for (var i = 0; i < length; i++){
        binary = `0${binary}`
    }
    
    i = 0;
    while (i < binary.length){
        ret.unshift(parseInt(binary.substr(i, 8), 2) as TByte)
        i += 8
    }
    return ret
}

