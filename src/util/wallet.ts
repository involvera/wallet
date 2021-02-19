import { Ripemd160, Sha256 } from "./hash"

export const ToPubKeyHash = (pubk: string | Uint8Array) => {
    return Ripemd160(Sha256(pubk))
}