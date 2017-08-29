
const parser = require('xml2json')
const fs = require('fs')
const _ = require('isa.js')
const { promisify } = require('util')

let readFile = promisify( fs.readFile )
let writeFile = promisify( fs.writeFile )

async function convert () {
	let xml = await readFile( '../../arum_aruk.xml', { encoding: 'utf8' })

	let json = parser.toJson(xml)
	await writeFile( '../../aruk.json', json, { encoding: 'utf8' })
}

async function narrow () {
	let json = JSON.parse( await readFile( '../../aruk.json', { encoding: 'utf8' }) )

	await writeFile( '../../aruk_pretty.json', JSON.stringify(json, null, 4) /* JSON.stringify(reduced) */, { encoding: 'utf8' })

	let reduced = json.products.product.slice(0, 1000)
	await writeFile( '../../aruk_reduced.json', JSON.stringify(reduced, null, 4) /* JSON.stringify(reduced) */, { encoding: 'utf8' })
}


narrow()
