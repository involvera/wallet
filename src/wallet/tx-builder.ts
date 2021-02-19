import { TByte } from "../constant";
import { LAST_CCH_NOT_FOUND_ERROR, NOT_ENOUGH_FUNDS_ERROR, WRONG_TX_BUILDER_STRUCTURE_ERROR } from "../constant/errors";
import { wallet } from "../models";
import { EMPTY_CODE } from "../script/constant";
import { Input, Output, OutputList, Transaction, UTXO, UTXOList } from "../transaction"
import { Int64ToByteArray } from "../util";
import { CalculateOutputValueFromMelted } from "../util/output";

interface ITXBuild {
	to:             Uint8Array[]
	amount_required: number[]
	kinds:          Uint8Array
	ta:             Uint8Array[][]
}

export class TxBuild {

	private to:             Uint8Array[]
    private amount_required: number[]
	private kinds:          Uint8Array
    private ta:             Uint8Array[][]
    
    constructor(txb: ITXBuild){
        this.to = txb.to
        this.amount_required = txb.amount_required
        this.kinds = txb.kinds
        this.ta = txb.ta
    }

    private _checkStructureBuild = () => {
        const length = this.to.length
        if (length != this.amount_required.length && length != this.kinds.length && this.ta.length){
            throw WRONG_TX_BUILDER_STRUCTURE_ERROR
        }
    }

    totalAmount = () => this.amount_required.reduce((accumulator: number, currentValue: number) => accumulator + currentValue)

    addTXFeesToBuild = (fees: number) => {
        this.to.push(wallet.fees().get().pubKHToSend())
        this.amount_required.push(fees)
        this.kinds = new Uint8Array(Buffer.concat([Buffer.from(this.kinds), Buffer.from(new Uint8Array([0]))]))
        // this.ta = 
    }

    estimateFees = () => {

    }

    setupUTXOs = (amountRequired: number) => {
        const availableUTXOs = wallet.utxos().get().get().requiredList(amountRequired)
        if (availableUTXOs.get().totalMeltedValue() < amountRequired){
            throw NOT_ENOUGH_FUNDS_ERROR
        }
        return availableUTXOs
    }

    newTx = () => {
        this._checkStructureBuild()

        const { inputs, outputs } = this.generateMeltingPuts(0)
        const lastCCH = wallet.cch().last()
        if (!lastCCH)
            throw LAST_CCH_NOT_FOUND_ERROR
        
        const tx = new Transaction({
            t: Int64ToByteArray(BigInt((new Date().getTime() / 1000))),
            inputs: inputs.to().plain(), 
            outputs: outputs.to().plain(),
            lh: wallet.cch().last() as Buffer
        }, {})
    }

    generateMeltingPuts = (fees: number) => {
        let outputs = new OutputList([], {})
        const utxos = this.setupUTXOs(this.totalAmount())
        const amounts = this.amount_required
        const nInputs = utxos.count()


        let currentRealAmountToSend: BigInt = BigInt(0)
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
            return (utxos.nodeAt(index) as UTXO).get().meltedValue()
        }

        const refreshCurrentRealAmountToSend = (val: number) => {
            const mr = (utxos.nodeAt(utxoIndex) as UTXO).get().meltedValueRatio()
            currentRealAmountToSend = BigInt(currentRealAmountToSend) + BigInt(CalculateOutputValueFromMelted(val, mr))
        }

        const pushOutput = (toIndex: number, fromIdx: number, toIdx: number) => {
            const inputIdxLength = toIdx - fromIdx + 1
            const target = this.ta[toIndex]
    
            outputs.push(Output.NewOutput(this.to[toIndex], currentRealAmountToSend, newIntArrayFilled(inputIdxLength, fromIdx), this.kinds[toIndex] as TByte, target))
        }

        const pushSurplusOutput = (lastUTXOIdx: number) => {
            const totalUsed = outputs.get().totalValue()
            const emptyTa: Uint8Array[] = []
            outputs.push(Output.NewOutput(wallet.keys().get().pubHash(), utxos.get().totalValue()-totalUsed, newIntArrayFilled(nInputs-lastUTXOIdx, lastUTXOIdx), EMPTY_CODE, emptyTa))
        }

        const totalInEscrow = utxos.get().totalMeltedValue()
        const totalToSend = this.totalAmount()
        let totalToSendLeft = totalToSend
        let amountsLeftToTakeInCurrentUTXO = getMeltedValueAtUTXOIndex(utxoIndex)

        while (totalToSendLeft > 0){
            let fromUTXOIdx = utxoIndex
            let meltedAmountLeftToSendInCurrentOutput = amounts[toIndex]
            currentRealAmountToSend = BigInt(0)

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
            inputs: utxos.toInputs(), 
            outputs
        }
    }
}