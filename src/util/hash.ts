import createHash from 'create-hash'

export const Sha256 = (val: string | Uint8Array): Uint8Array => {
    return createHash('sha256').update(Buffer.from(val)).digest()
}