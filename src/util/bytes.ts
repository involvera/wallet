const MAX_UINT_8 = BigInt(256)
const MAX_UINT_16 = BigInt(65536)
const MAX_UINT_32 = BigInt(4294967296)
const MAX_UINT_64 = BigInt(18446744073709551616)

const TWO = BigInt(2)
const ONE = BigInt(1)
const ZERO = BigInt(0)
const MINUS = BigInt(-1)


export const B64ToBigInt = (b64: string, isNegative: boolean): BigInt => {
    return ByteArrayToInt(B64ToByteArray(b64), isNegative)
}

export const B64ToByteArray = (b64: string): Uint8Array => {
    return new Uint8Array(Buffer.from(b64, 'base64'))
}

export const StringToByteArray = (str: string): Uint8Array => {
    let utf8 = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8[i] = charcode;
        else if (charcode < 0x800) {
            utf8[i] = 0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f);
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8[i] = 0xe0 | (charcode >> 12),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f);
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8[i] = 0xf0 | (charcode >>18),
                      0x80 | ((charcode>>12) & 0x3f),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f);
        }
    }
    return utf8
}

export const ByteArrayToString = (array: Uint8Array): string => {
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

export const ByteArrayToInt = (value: Uint8Array, isNegative: boolean): BigInt => {
    let n = BigInt(0);
    let MAX = MAX_UINT_8
    switch(value.length){
        case 1:
            MAX = MAX_UINT_8
            break;
        case 2:
            MAX = MAX_UINT_16
            break;
        case 4:
            MAX = MAX_UINT_32
            break;
        case 8:
            MAX = MAX_UINT_64
            break;
    }

    const readBigUInt64LE = (buffer: Buffer, offset = 0) => {
        const first = buffer[offset];
        const last = buffer[offset + 7];
        if (first === undefined || last === undefined) {
          throw new Error('Out of bounds');
        }
      
        const lo = first +
          buffer[++offset] * 2 ** 8 +
          buffer[++offset] * 2 ** 16 +
          buffer[++offset] * 2 ** 24;
      
        const hi = buffer[++offset] +
          buffer[++offset] * 2 ** 8 +
          buffer[++offset] * 2 ** 16 +
          last * 2 ** 24;
      
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
    }

    if (value.length == 8) {
        n = readBigUInt64LE(Buffer.from(value), 0)
    } else {
        switch (value.length){
            case 4:
                n = BigInt(Buffer.from(value).readUInt32LE(0))
                break;
            case 2:
                n = BigInt(Buffer.from(value).readUInt16LE(0))
                break;
            case 1:
                n = BigInt(value[0])
                break;

        }
    }
    return isNegative ? n - MAX : n
}

export const EncodeArrayInt = (array: number[]): Uint8Array[] => {
    let ret: Uint8Array[] = []
    for (let i = 0; i < array.length; i++) {
        ret[i] = IntToByteArray(BigInt(array[i]))
    }
    return ret
}

export const DecodeArrayInt = (array: Uint8Array[]): BigInt[] => {
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

const intToByteArray = (val: BigInt, valType: 'int8' | 'int16' | 'int32' | 'int64', isUnsigned: boolean): Uint8Array => {
    const M = {'int8': MAX_UINT_8, 'int16': MAX_UINT_16, 'int32': MAX_UINT_32, 'int64': MAX_UINT_64}[valType]
    const N_BYTE = {'int8': 8, 'int16': 16, 'int32': 32, 'int64': 64}[valType]
    const CURRENT_MIN_INT = (M / TWO) * MINUS
    const CURRENT_MAX_INT = (M / TWO) - ONE

     if (!isUnsigned && (val < CURRENT_MIN_INT || val > CURRENT_MAX_INT)){
        throw new Error("overflow")
    } else if (isUnsigned && (val < ZERO || val > ((CURRENT_MAX_INT * TWO) + ONE))){
        throw new Error("unsigned overflow")
    }

    if (val < ZERO) {
        val = ((CURRENT_MAX_INT+ONE) * TWO) + BigInt(val)
    }

    let binary = val.toString(2);
    const length = N_BYTE - binary.length
    for (var i = 0; i < length; i++){
        binary = `0${binary}`
    }
    
    var ret = new Uint8Array(binary.length / 8)
    i = 0;
    while (i < binary.length){
        ret[(binary.length / 8) - 1 - i] = parseInt(binary.substr(i, 8), 2)
        i += 8
    }
    return ret
}

