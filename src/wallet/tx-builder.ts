import { CANT_SEND_0_VALUE, LAST_CCH_NOT_FOUND_ERROR, NOT_ENOUGH_FUNDS_ERROR, WRONG_TX_BUILDER_STRUCTURE_ERROR } from "../constant/errors";
import { ScriptEngineV2 } from "../scriptV2";
import {  InputList, Output, OutputList, Transaction, UTXO, UTXOList } from "../transaction"
import { PubKeyHashFromAddress } from "../util";
import { CalculateOutputValueFromMelted } from "../util/output";
import { Wallet } from './'

export interface ITXBuild {
    wallet:         Wallet[]
	amount_required: number[]
	scripts:             Buffer[][]
}

export default class TxBuild {

    private amount_required: number[]
    private scripts:             Buffer[][]
    private wallets: Wallet[]

    constructor(txb: ITXBuild){
        this.amount_required = txb.amount_required
        this.scripts = txb.scripts
        this.wallets = txb.wallet
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
        const lockScript = new ScriptEngineV2([])
        lockScript.append().lockScript(PubKeyHashFromAddress(this.wallets[0].fees().get().addressToSend()))
        this.amount_required.push(fees)
        this.scripts.push(lockScript.bytes())       
    }

    private _removeLastOutput = () => {
        this.scripts.pop()
        this.amount_required.pop()
    }

    private _makeTxWithFees = (tx: Transaction): UTXOList => {
        const fees = tx.get().billedSize() * this.wallets[0].fees().get().feePerByte()
        
        this._addTXFeesToBuild(fees)
        const { utxos, outputs } = this._generateMeltingPuts()
        const inputs = utxos.toInputs()

        const shouldRecall = inputs.count() != tx.get().inputs().count() || outputs.count() != tx.get().outputs().count()

        tx.setState({ 
            inputs: new InputList(inputs.to().plain(), tx.kids()),
            outputs: new OutputList(outputs.to().plain(), tx.kids()),
        })

        if (shouldRecall){
            this._removeLastOutput()
            return this._makeTxWithFees(tx)
        }


        return utxos
    }

    setupUTXOs = (amountRequired: number) => {
        const availableUTXOs: UTXOList = new UTXOList([], undefined)
        let newAmountRequired = amountRequired

        for (let i = 0; i < this.wallets.length; i++) {
            availableUTXOs.append(this.wallets[i].utxos().get().get().requiredList(newAmountRequired, this.wallets[i].cch().get().list()).state)
            const totalEscrow = availableUTXOs.get().totalMeltedValue(this.wallets[i].cch().get().list())
            if (totalEscrow >= amountRequired){
                break
            }
            newAmountRequired = amountRequired - totalEscrow
        }

        if (availableUTXOs.get().totalMeltedValue(this.wallets[0].cch().get().list()) < amountRequired){
            throw NOT_ENOUGH_FUNDS_ERROR
        }
        return availableUTXOs
    }

    newTx = async () => {
        this._checkStructureBuild()
        const { outputs, utxos } = this._generateMeltingPuts()
        const lastCCH = this.wallets[0].cch().get().last()
        if (!lastCCH)
            throw LAST_CCH_NOT_FOUND_ERROR
        
        let tx = new Transaction({
            lh: this.wallets[0].cch().get().lastHeight(),
            t: Date.now(),
            inputs: utxos.toInputs().to().plain(), 
            outputs: outputs.to().plain(),
        }, {})


        if (await tx.sign(this._makeTxWithFees(tx), this.wallets)){
            return tx
        }
        return null
    }

    _generateMeltingPuts = () => {
        let outputs = new OutputList([], {})
        const utxos = this.setupUTXOs(this.totalAmount())
        const amounts = this.amount_required
        const nInputs = utxos.count()
        const CCHList = this.wallets[0].cch().get().list()

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
            return (utxos.nodeAt(index) as UTXO).get().meltedValue(CCHList)
        }

        const refreshCurrentRealAmountToSend = (val: number) => {
            const mr = (utxos.nodeAt(utxoIndex) as UTXO).get().meltedValueRatio(CCHList)
            currentRealAmountToSend = currentRealAmountToSend + Number(CalculateOutputValueFromMelted(val, mr))
        }

        const pushOutput = (toIndex: number, fromIdx: number, toIdx: number) => {
            const inputIdxLength = toIdx - fromIdx + 1
            const script = new ScriptEngineV2(this.scripts[toIndex])
            outputs.push(Output.NewOutput(currentRealAmountToSend, newIntArrayFilled(inputIdxLength, fromIdx), script.base64() ).to().plain())
        }

        const pushSurplusOutput = (lastUTXOIdx: number) => {
            const script = new ScriptEngineV2([])
            script.append().lockScript(this.wallets[0].keys().get().pubHash())
            
            const totalUsed = outputs.get().totalValue()
            outputs.push(Output.NewOutput(Number(utxos.get().totalValue()-totalUsed), newIntArrayFilled(nInputs-lastUTXOIdx, lastUTXOIdx), script.base64()).to().plain())
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