import * as bip39 from 'bip39'

export const NewMnemonic = (): string => {
    return bip39.generateMnemonic()
}
