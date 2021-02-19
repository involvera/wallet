import createHash from 'create-hash'

export const Sha256 = (val: string | Uint8Array): Buffer => {
    return createHash('sha256').update(Buffer.from(val)).digest()
}

export const Ripemd160 = (val: string | Uint8Array): Buffer => {
    return createHash('ripemd160').update(Buffer.from(val)).digest()
}