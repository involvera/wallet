import { TByte } from "../constant"

export const NewIntArrayFilled = (length: number, from: number): number[] => {
    let ret: number[] = []
    for (let i =0; i < length; i++){
        ret[i] = from + i
    }
    return ret
}

export const PushToUint8Array = (array: Uint8Array, elem: TByte) => {
    return new Uint8Array(Buffer.concat([Buffer.from(array), Buffer.from(new Uint8Array([elem]))]))
}

export const PopUint8Array = (array: Uint8Array) => {
    const ret = new Uint8Array(array.length - 1)
    for (let i = 0; i < array.length-1; i++){
        ret[i] = array[i]
    }
    return ret
}

export const NewEmptyDoubleUint8Array = (): Uint8Array[] => {
    const emptyDoubleUin8Array: Uint8Array[] = []
    return emptyDoubleUin8Array
}