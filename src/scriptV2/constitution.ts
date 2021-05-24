import { MAX_CONSTITUTION_RULE } from "../constant"
import { WRONG_CONSTITUTION_LENGTH } from "../constant/errors"

export interface IConstitutionRule {
    title: string
    content: string
}

export type TConstitution = IConstitutionRule[]

export const NewConstitution = () => {
    const consti: TConstitution = []
    for (let i = 0; i < MAX_CONSTITUTION_RULE; i++)
        consti.push({ title: "\r", content: "\r" })
	return consti
}

export const SerialConstitution = (consti: TConstitution) => {
	let ret = Buffer.from([])
	for (let i = 0; i < consti.length; i++){
		ret = Buffer.concat([ret, Buffer.from(consti[i].title + '\n')])
		ret = Buffer.concat([ret, Buffer.from(consti[i].content)])
		if (i < MAX_CONSTITUTION_RULE-1)
			ret = Buffer.concat([ret, Buffer.from('\n\n')])
	}
	return ret
}

export const DeserializeConstitution = (serialized: Buffer) => {
	const c = NewConstitution()
	const strSerial = serialized.toString()
	let list = strSerial.split('\n\n')

	if (list.length > MAX_CONSTITUTION_RULE)
		list = list.slice(0, MAX_CONSTITUTION_RULE)
	else if (list.length < MAX_CONSTITUTION_RULE)
		throw WRONG_CONSTITUTION_LENGTH
	
	for (let i = 0; i < MAX_CONSTITUTION_RULE; i++){
		const splited = list[i].split('\n')
		c[i].title = splited[0]
		c[i].content = splited[1]
	}
	return c		
}
