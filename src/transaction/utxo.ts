import { Collection, Model } from 'acey'
import { ByteArrayToString, IntToByteArray, StringToByteArray } from '../util'
import { Output } from './output'
import { Input, InputList } from './input'

//AFshRLtjfQXkFM447DC4hNWMYnckuvGuxiJzeKa7JFZ8mWF9LrK1GsHBNL8EdETVTgyiqp73yUmy2jGm3CdmeEzXsUPQVHQs8qW8akL4CfnY6FnsGQHnTUttMhCKVd9PRbdxiwmRxG9yQFg4MG9K7CQ1RU3PbdAnnvHshWeKJRr4H84cqcNvi1xmsem4Eu6Xgk6FiNNzc4w1uYXJEGE8wxtp9j2Q5WDYbGC7qtJ3zsiThko7DVsCud5Zj1PX6jjPC2b4kd1Bw629hYetqY51JZZdbyMPHw5z7G975NhBZzXWrHrMHuHLVi7EuvLM5JdrAvBHBGAmWPPstqaNgHFzNEQKXdQGuF5aj4rPHVHEW1xVbBdS8mNgSUC8jMg8QJWwsHnEES9zWnknqFYcwX7tmwu4HTpnNdqmr3JdNUdHXXMjMhwR5kCGWqkzQ5qtUcunfwHFRVnB3MM8hmcsJ6AsZiRGcez8SSVmf2merDmxVvkyYTP1NviMuf1PD12p3jJ1bu6m9Kpq3bJWK7Yq5QcCwUgPBNNUdDpCUpsdmUj7KP5xHoKjPrWH4Vf27oi7E8WB9jFCti2cjPw5ZSNyyjh4cThPX8hAMv2vJFj8siiuRFRgW74j4SVZHhija9N7PN8Bk8KX5SjxDTNufpw5a4ZQy1LvwC4JjxyUf3YisT1pRzq3CQ11q3iUDv8WUp8j9gVUEzUhSBnZv5dxKcUENU7HEKS5ALHNEF7PVSZYKdf6f7dkgu22RUWtPom4WUeS8Rcc7FzuekRELPy52bz9b7QeDqhH485hi4n8o3iz5ddcsDfXDx4DeP2qzVrZWmRzLzdVoWoRosuMg4vFNBbhuHuhxKe7Wo3kpQhW9LMPwQsPw5jGuH77dmF6KCr8eXWiBay5fD3vhnrjZcNdDt8kjioLwWENiLc7FxhNgiedRNzEMTYtXy7Pg2SYz2qKKuzZyN7ZVsUKodSt62eK5L4Ea233Vvdk53dCCTRLDjJPjeocJEq3KH6hogrJHTAYXLhj72TCzUxif7uBnuLhzztNtUkEdDbqRdDAZCvgNoK44CEKRJKWnytZpTpUc2gfqpDUtPBExMtbxjkBT6nir5y5upURBkqh52SP1gC49XicQimAh5vakjxTKGqLDgDyHQLYVsind79HQBCpgjB9vQqM55pX4hh284YDgPJAPowN71Nt9CpmkRd5AFzHBEv2qsCeSDfaLauftijnkzuZJyhpKMXfsJPkREhuKS6s9D8e1Y6iCYQGS1gZ9nFioqW5gfJUxDvVwrAmoYJaekdg9nkFfHfA8rv5mX1iDvdtfDis3XQ7jAMRDeRX3zSkZDzmMg4nzbYFPYwzzo5bkbqscVwbD6uKcc9HcJmSvSJHYBFeDytA22u17zqpuXYs5uVy2rkcSDEh3iPGwKuMp89PQ2QCfqAeZviUorbyAvyisfLVth6d6MUh1yqHDVHrhFp5Gzi7zo66uv2XNMsme1oE1sZVhijw4WhLcNzrsVdawxYEVHTi48GzDP24dKE9sRd8WCPXLCSb7Q67Zi3UVDPnr8ob6MYgpRwnpeNfT3ibCgYnJVXBjG6aLJAfTuvEZrgWNEFNsT1sWDp945PDokzKyDffXwgUYkwLdM626FH8F1SAwW5iieod5ZNP8UdUTRxsRAmWooVdVLVFoYAJJgP25ov1h4qtspwuVTGCFeJB6d6hzRPZcJqKrs3d5vaVPCBpVadcJyVUj8HTvUSxBskdCCrfSrrxAvQ32tz4gpEJTY5bRXeizforiRjvCRfHDN4Qot2WsyFxXnQ2TQf538tLXvMyoCRtizpcV3c4mKjQwrqZPvRcUsVMFCBSFN5AkBHNDRgczLsTVcMpSG8WMUb3JDsiU51b9q6QWoXB2vPYGtK5fzziZH4tjcjEZSRLZ1DLvmscXf3U7BkqbJZubyBfSg5zB1ggeZ

export interface IUTXO {
    tx_id: Uint8Array
    idx: BigInt
    output: Output
    mr: number
    cch: Uint8Array
}

export class UTXO extends Model {

    constructor(utxo: IUTXO, options: any) {
        super(utxo, options)
        this.setState({
            output: new Output(this.state.output, this.kids())
        })
    }

    txID = (): Uint8Array => this.state.tx_id
    idx = (): BigInt => this.state.idx
    output = (): Output => this.state.output
    mr = (): number => this.state.mr
    cch = (): Uint8Array => this.state.cch

}

export class UTXOS extends Collection {

    static deserialize = (serialized: Uint8Array): IUTXO[] => {
        return JSON.parse(ByteArrayToString(serialized))
    }

    constructor(list: IUTXO[], options: any){
        super(list, options)
    }

    toInputs = () => {
        return new InputList(
            this.map((utxo: UTXO) => {
                return {prev_transaction_hash: utxo.txID(), vout: IntToByteArray(utxo.idx()), sign: new Uint8Array()}
            }),
            {}
        )
    }

    totalValue = () => {
        return this.reduce((total: bigint, utxo: UTXO) => {
            total = BigInt(utxo.output().getValueBigInt()) + BigInt(total)

        }, 0) as BigInt
    }

    serialize = () => StringToByteArray(this.to().string())
}