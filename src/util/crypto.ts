import * as bip39 from 'bip39'

export const NewMnemonic = (): string => bip39.generateMnemonic()
