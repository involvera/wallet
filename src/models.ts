import Wallet from './wallet/wallet'
import WalletModel from './wallet/wallet'

export const wallet = new WalletModel({}, { key: 'wallet', connected: true })
export const wallet2 = new WalletModel({}, {key: 'wallet2', connected: true })