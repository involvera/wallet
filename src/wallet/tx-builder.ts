import { CANT_SEND_0_VALUE, LAST_CCH_NOT_FOUND_ERROR, NOT_ENOUGH_FUNDS_ERROR, WRONG_TX_BUILDER_STRUCTURE_ERROR } from "../constant/errors";
import {  OutputModel, OutputCollection, TransactionModel, UTXOModel, UTXOCollection } from "../transaction"
import { Inv } from "wallet-util";
import WalletModel from './wallet'
import { Script } from "wallet-script";
import { TByte } from "community-coin-types";

export interface ITXBuild {
    wallet:         WalletModel
	amount_required: Inv.InvBigInt[]
	scripts:             Uint8Array[][]
}

export const CalculateOutputValueFromMelted = (meltedAmount: Inv.InvBigInt, meltedRatio: number): Inv.InvBigInt => {
    return Inv.InvBigInt.ceil(meltedAmount.divDecimals(meltedRatio))
}

export default class TxBuild {

    private amount_required: Inv.InvBigInt[]
    private scripts:           Uint8Array[][]
    private wallet: WalletModel

    constructor(txb: ITXBuild){
        this.amount_required = txb.amount_required
        this.scripts = txb.scripts
        this.wallet = txb.wallet
    }

    private _checkStructureBuild = () => {
        if (this.amount_required.length !== this.scripts.length){
            throw WRONG_TX_BUILDER_STRUCTURE_ERROR
        }
        //<= 0
        if (this.totalAmount().lwe(0)){
            throw CANT_SEND_0_VALUE
        }
    }

    totalAmount = () => this.amount_required.reduce((accumulator: Inv.InvBigInt, currentValue: Inv.InvBigInt) => accumulator.add(currentValue))

    private _addTXFeesToBuild = (fees: Inv.InvBigInt) => {
        const lockScript = Script.build().lockScript(this.wallet.fees().get().addressToSend().toPKH())
        this.amount_required.push(fees)
        this.scripts.push(lockScript.bytes())
    }

    private _removeLastOutput = () => {
        this.scripts.pop()
        this.amount_required.pop()
    }

    private _makeTxWithFees = (tx: TransactionModel): UTXOCollection => {
        const fees = tx.get().fees(this.wallet.fees().get().feePerByte())

        this._addTXFeesToBuild(fees)
        const { utxos, outputs } = this._generateMeltingPuts()
        const inputs = utxos.toInputs()

        const shouldRecall = inputs.count() != tx.get().inputs().count() || outputs.count() != tx.get().outputs().count()

        tx.get().inputs().setState(inputs.to().plain())
        tx.get().outputs().setState(outputs.to().plain())

        if (shouldRecall){
            this._removeLastOutput()
            return this._makeTxWithFees(tx)
        }

        return utxos
    }

    setupUTXOs = (amountRequired: Inv.InvBigInt) => {
        const availableUTXOs = this.wallet.utxos().get().get().requiredList(amountRequired, this.wallet.cch().get().list())
        const totalEscrow = availableUTXOs.get().totalMeltedValue(this.wallet.cch().get().list())
        if (totalEscrow.lw(amountRequired)){
            throw NOT_ENOUGH_FUNDS_ERROR            
        }
        return availableUTXOs
    }

    newTx = (txVersion: TByte) => {
        this._checkStructureBuild()
        const { outputs, utxos } = this._generateMeltingPuts()
        const lastCCH = this.wallet.cch().get().last()
        if (!lastCCH)
            throw LAST_CCH_NOT_FOUND_ERROR
        
        let tx = new TransactionModel({
            v: txVersion,
            lh: this.wallet.cch().get().lastHeight(),
            t: Date.now(),
            inputs: utxos.toInputs().to().plain(), 
            outputs: outputs.to().plain(),
        }, {})

        this._makeTxWithFees(tx)
        return this.wallet.sign().transaction(tx) ? tx : null
    }

    _generateMeltingPuts = () => {
        let outputs = new OutputCollection([], {})
        const utxos = this.setupUTXOs(this.totalAmount())
        const amounts = this.amount_required.slice()
        const nInputs = utxos.count()
        const CCHList = this.wallet.cch().get().list()

        let currentRealAmountToSend = new Inv.InvBigInt(0) 
        let toIndex = 0
        let utxoIndex = 0
    
        const newIntArrayFilled = (length: number, from: number): number[] => {
            let ret: number[] = []
            for (let i =0; i < length; i++)
                ret[i] = from + i
            return ret
        }

        const getMeltedValueAtUTXOIndex = (index: number) => {
            return (utxos.nodeAt(index) as UTXOModel).get().meltedValue(CCHList)
        }

        const refreshCurrentRealAmountToSend = (val: Inv.InvBigInt) => {
            const mr = (utxos.nodeAt(utxoIndex) as UTXOModel).get().meltedValueRatio(CCHList)
            currentRealAmountToSend.addEq(CalculateOutputValueFromMelted(val, mr))
        }

        const pushOutput = (toIndex: number, fromIdx: number, toIdx: number) => {
            const inputIdxLength = toIdx - fromIdx + 1
            const script = Script.new(this.scripts[toIndex])
            outputs.push(OutputModel.NewOutput(currentRealAmountToSend, newIntArrayFilled(inputIdxLength, fromIdx), script.base64() ).to().plain())
        }

        const pushSurplusOutput = (lastUTXOIdx: number) => {
            const lockScript = Script.build().lockScript(this.wallet.keys().get().pubHash())
            const totalUsed = outputs.get().totalValue()
            outputs.push(OutputModel.NewOutput(utxos.get().totalValue().sub(totalUsed), newIntArrayFilled(nInputs-lastUTXOIdx, lastUTXOIdx), lockScript.base64()).to().plain())
        }

        const totalInEscrow = utxos.get().totalMeltedValue(CCHList)
        const totalToSend = this.totalAmount()
        let totalToSendLeft = new Inv.InvBigInt(totalToSend)
        let amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)

        //>0
        while (totalToSendLeft.gt(0)){
            let fromUTXOIdx = utxoIndex
            let meltedAmountLeftToSendInCurrentOutput = new Inv.InvBigInt(amounts[toIndex])
            currentRealAmountToSend = new Inv.InvBigInt(0)

            //>0
            while (meltedAmountLeftToSendInCurrentOutput.gt(0)){
                if (meltedAmountLeftToSendInCurrentOutput.gt(amountsLeftToTakeInCurrentUTXO)){
                    refreshCurrentRealAmountToSend(amountsLeftToTakeInCurrentUTXO)
                    meltedAmountLeftToSendInCurrentOutput.subEq(amountsLeftToTakeInCurrentUTXO)
                    totalToSendLeft.subEq(amountsLeftToTakeInCurrentUTXO)
                    utxoIndex++
                    amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)
                } else if (meltedAmountLeftToSendInCurrentOutput.eq(amountsLeftToTakeInCurrentUTXO)) {
                    refreshCurrentRealAmountToSend(amountsLeftToTakeInCurrentUTXO)
                    meltedAmountLeftToSendInCurrentOutput.subEq(amountsLeftToTakeInCurrentUTXO)
                    totalToSendLeft.subEq(amountsLeftToTakeInCurrentUTXO)
                    pushOutput(toIndex, fromUTXOIdx, utxoIndex)
                    if (utxoIndex+1 < nInputs) {
                        utxoIndex++
                        toIndex++
                        amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)
                    }
                } else if (meltedAmountLeftToSendInCurrentOutput.lw(amountsLeftToTakeInCurrentUTXO)){
                    refreshCurrentRealAmountToSend(meltedAmountLeftToSendInCurrentOutput)
                    amountsLeftToTakeInCurrentUTXO.subEq(meltedAmountLeftToSendInCurrentOutput)
                    totalToSendLeft.subEq(meltedAmountLeftToSendInCurrentOutput)
                    meltedAmountLeftToSendInCurrentOutput = new Inv.InvBigInt(0)
                    pushOutput(toIndex, fromUTXOIdx, utxoIndex)   
                    toIndex++         
                }
            }
            
            if (totalToSendLeft.eq(0) && totalInEscrow.gt(totalToSend)) {
                pushSurplusOutput(utxoIndex)
            }
        }

        return {
            outputs,
            utxos
        }
    }
}