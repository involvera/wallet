import { CANT_SEND_0_VALUE, LAST_CCH_NOT_FOUND_ERROR, NOT_ENOUGH_FUNDS_ERROR, WRONG_TX_BUILDER_STRUCTURE_ERROR } from "../constant/errors";
import { ScriptEngine } from "wallet-script";
import { Buffer } from 'buffer'
import {  OutputModel, OutputCollection, Transaction, UTXOModel, UTXOCollection } from "../transaction"
import { PubKeyHashFromAddress, CalculateOutputValueFromMelted } from "wallet-util";
import WalletModel from './wallet'

export interface ITXBuild {
    wallet:         WalletModel
	amount_required: number[]
	scripts:             Buffer[][]
}

export default class TxBuild {

    private amount_required: number[]
    private scripts:             Buffer[][]
    private wallet: WalletModel

    constructor(txb: ITXBuild){
        this.amount_required = txb.amount_required
        this.scripts = txb.scripts
        this.wallet = txb.wallet
    }

    private _checkStructureBuild = () => {
        if (this.amount_required.length != this.scripts.length){
            throw WRONG_TX_BUILDER_STRUCTURE_ERROR
        }
        if (this.totalAmount() <= 0){
            throw CANT_SEND_0_VALUE
        }
    }

    totalAmount = () => this.amount_required.reduce((accumulator: number, currentValue: number) => accumulator + currentValue)

    private _addTXFeesToBuild = (fees: number) => {
        const lockScript = new ScriptEngine([])
        lockScript.append().lockScript(PubKeyHashFromAddress(this.wallet.fees().get().addressToSend()))
        this.amount_required.push(fees)
        this.scripts.push(lockScript.bytes())       
    }

    private _removeLastOutput = () => {
        this.scripts.pop()
        this.amount_required.pop()
    }

    private _makeTxWithFees = (tx: Transaction): UTXOCollection => {
        const fees = tx.get().billedSize() * this.wallet.fees().get().feePerByte()
        
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

    setupUTXOs = (amountRequired: number) => {
        const availableUTXOs = this.wallet.utxos().get().get().requiredList(amountRequired, this.wallet.cch().get().list())
        const totalEscrow = availableUTXOs.get().totalMeltedValue(this.wallet.cch().get().list())
        if (totalEscrow < amountRequired){
            throw NOT_ENOUGH_FUNDS_ERROR
        }
        return availableUTXOs
    }

    newTx = async () => {
        this._checkStructureBuild()
        const { outputs, utxos } = this._generateMeltingPuts()
        const lastCCH = this.wallet.cch().get().last()
        if (!lastCCH)
            throw LAST_CCH_NOT_FOUND_ERROR
        
        let tx = new Transaction({
            lh: this.wallet.cch().get().lastHeight(),
            t: Date.now(),
            inputs: utxos.toInputs().to().plain(), 
            outputs: outputs.to().plain(),
        }, {})

        this._makeTxWithFees(tx)
        if (await this.wallet.sign().transaction(tx)){
            return tx
        }
        return null
    }

    _generateMeltingPuts = () => {
        let outputs = new OutputCollection([], {})
        const utxos = this.setupUTXOs(this.totalAmount())
        const amounts = this.amount_required
        const nInputs = utxos.count()
        const CCHList = this.wallet.cch().get().list()

        let currentRealAmountToSend: number = 0 
        let toIndex = 0
        let utxoIndex = 0
    
        const newIntArrayFilled = (length: number, from: number): number[] => {
            let ret: number[] = []
            for (let i =0; i < length; i++){
                ret[i] = from + i
            }
            return ret
        }

        const getMeltedValueAtUTXOIndex = (index: number) => {
            return (utxos.nodeAt(index) as UTXOModel).get().meltedValue(CCHList)
        }

        const refreshCurrentRealAmountToSend = (val: number) => {
            const mr = (utxos.nodeAt(utxoIndex) as UTXOModel).get().meltedValueRatio(CCHList)
            currentRealAmountToSend = currentRealAmountToSend + Number(CalculateOutputValueFromMelted(val, mr))
        }

        const pushOutput = (toIndex: number, fromIdx: number, toIdx: number) => {
            const inputIdxLength = toIdx - fromIdx + 1
            const script = new ScriptEngine(this.scripts[toIndex])
            outputs.push(OutputModel.NewOutput(currentRealAmountToSend, newIntArrayFilled(inputIdxLength, fromIdx), script.base64() ).to().plain())
        }

        const pushSurplusOutput = (lastUTXOIdx: number) => {
            const script = new ScriptEngine([])
            script.append().lockScript(this.wallet.keys().get().pubHash())
            
            const totalUsed = outputs.get().totalValue()
            outputs.push(OutputModel.NewOutput(Number(utxos.get().totalValue()-totalUsed), newIntArrayFilled(nInputs-lastUTXOIdx, lastUTXOIdx), script.base64()).to().plain())
        }

        const totalInEscrow = utxos.get().totalMeltedValue(CCHList)
        const totalToSend = this.totalAmount()
        let totalToSendLeft = totalToSend
        let amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)

        while (totalToSendLeft > 0){
            let fromUTXOIdx = utxoIndex
            let meltedAmountLeftToSendInCurrentOutput = amounts[toIndex]
            currentRealAmountToSend = 0

            while (meltedAmountLeftToSendInCurrentOutput > 0){

                if (meltedAmountLeftToSendInCurrentOutput > amountsLeftToTakeInCurrentUTXO){
                    refreshCurrentRealAmountToSend(amountsLeftToTakeInCurrentUTXO)
                    meltedAmountLeftToSendInCurrentOutput -= amountsLeftToTakeInCurrentUTXO
                    totalToSendLeft -= amountsLeftToTakeInCurrentUTXO
                    utxoIndex++
                    amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)
                } else if (meltedAmountLeftToSendInCurrentOutput == amountsLeftToTakeInCurrentUTXO) {
                    refreshCurrentRealAmountToSend(amountsLeftToTakeInCurrentUTXO)
                    meltedAmountLeftToSendInCurrentOutput -= amountsLeftToTakeInCurrentUTXO
                    totalToSendLeft -= amountsLeftToTakeInCurrentUTXO
                    pushOutput(toIndex, fromUTXOIdx, utxoIndex)
                    if (utxoIndex+1 < nInputs) {
                        utxoIndex++
                        toIndex++
                        amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)
                    }
                } else if (meltedAmountLeftToSendInCurrentOutput < amountsLeftToTakeInCurrentUTXO){
                    refreshCurrentRealAmountToSend(meltedAmountLeftToSendInCurrentOutput)
                    amountsLeftToTakeInCurrentUTXO -= meltedAmountLeftToSendInCurrentOutput
                    totalToSendLeft -= meltedAmountLeftToSendInCurrentOutput
                    meltedAmountLeftToSendInCurrentOutput = 0        
                    pushOutput(toIndex, fromUTXOIdx, utxoIndex)   
                    toIndex++         
                }
            }
            
            if (totalToSendLeft == 0 && totalInEscrow > totalToSend) {
                pushSurplusOutput(utxoIndex)
            }
        }

        return {
            outputs,
            utxos
        }
    }
}