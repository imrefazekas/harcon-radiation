const assert = require('assert')
const { promisify } = require('util')
let chai = require('chai'),
	should = chai.should(),
	expect = chai.expect

let Server = require('../util/Server')
let server

const request = require('request')
const WebSocket = require('ws')
let socketClaireClient, socketMarieClient

let fs = require('fs')
let path = require('path')

let Katie

let Cerobee = require('clerobee')
let clerobee = new Cerobee( 16 )

let Proback = require('proback.js')

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, ' .... reason:', reason)
})

async function post ( uri, body ) {
	return new Promise( (resolve, reject) => {
		request( {
			method: 'POST',
			uri: uri,
			json: true,
			body: body
		}, function (error, response, body) {
			if (error) return reject( error )
			resolve( { response: response, body: body } )
		} )
	} )
}

describe('harcon-radiation', function () {

	before( async function () {
		this.timeout(5000)


		let harconPath = path.join( process.cwd(), 'node_modules', 'harcon', 'test' )
		server = new Server( {
			name: 'Queen',
			harcon: {
				mortar: {
					folder: path.join( harconPath, 'entities' ),
					entityPatcher: function (entity) {
						entity.rest = true
						entity.websocket = true
					},
					waitFor: {
						entity: 'Radiation',
						timeout: 100
					}
				},
				marie: {greetings: 'Hi!'}
			},
			radiation: {
				name: 'Radiation',
				rest: { ignoreRESTPattern: false, jsonrpcPath: '/RPCTwo', harconrpcPath: '/Harcon' },
				websocket: { harconPath: '/QueenSocket', jsonrpcPath: '/RPCTwo' },
				assignSocket: async function (event, terms, res, socket ) {
					if (event === 'Katie.login')
						socket.name = res
					return 'ok'
				},
				identifySockets: async function ( sockets, target ) {
					let filtered = []
					for (let socket of sockets)
						if ( target === '*' || socket.name === target || socket.name === target.name )
							filtered.push( socket )
					return filtered
				},
				distinguish: '-Distinguished'
			}
		} )

		try {
			await server.init()

			await Proback.timeout(1000)

			Katie = {
				name: 'Katie',
				context: 'morning',
				rest: true,
				websocket: true,
				login: async function (name) {
					console.log('\n! Login: ', name, '!\n')
					return name
				},
				_changer: async function ( ) {
					let message = 'C\'est la vie'
					await this.shifted( { mood: message }, '*' )
					await this.shifted( { mood: 'Pour toi, Marie' }, 'Marie' )
					await this.shifted( { mood: 'Pour toi, Claire' }, 'Claire' )
					await this.shifted( { mood: 'C\'est fini, Marie' }, {name: 'Marie'} )
					return message
				}
			}
			await server.harcon.inflicterEntity.deploy( Katie )

			await server.radiation.listen( {
				shifted: function ( radiation, object ) {
					console.log( 'shifted', object )
				},
				posted: function ( radiation, request ) {
					console.log( 'posted', request )
				},
				ioCreacted: function ( radiation, namespace ) {
					console.log( 'ioCreacted', namespace )
				},
				ioConnected: function ( radiation, namespace ) {
					console.log( 'ioConnected', namespace )
				}
			} )

			socketClaireClient = new WebSocket('ws://localhost:8080/QueenSocket')
			socketClaireClient.on('open', function open () {
				console.log('Connected to QueenSocket')
				socketClaireClient.send( JSON.stringify( { id: clerobee.generate(), division: 'Queen', event: 'Katie.login', parameters: [ 'Claire' ] } ) )
			})
			socketClaireClient.on('message', function incoming (data) {
				data = JSON.parse( data )
				if ( data.state )
					console.log('MOOOOOOODD >>>>>>>>>>>>>> ', data)
			})

			socketMarieClient = new WebSocket('ws://localhost:8080/RPCTwo')
			socketMarieClient.on('open', function open () {
				console.log('Connected to KingSocket')
				socketMarieClient.send( JSON.stringify( { jsonrpc: '2.0', id: clerobee.generate(), division: 'Queen', method: 'Katie.login', params: [ 'Marie' ] } ) )
			})
			socketMarieClient.on('message', function incoming (data) {
				data = JSON.parse( data )
				if ( data.state )
					console.log('MOOOOOOODD >>>>>>>>>>>>>> ', data)
			})

			await Proback.timeout(3000)
		} catch (err) {
			console.error( err )
			assert.fail( err )
		}
	} )

	/*
	describe('System checks', function () {
		it('URIs', async function () {
			let uris = await radiation.entityURIs( )
			console.log( 'entityURIs>>>>>', JSON.stringify(uris) )
		} )
	} )
	*/

	describe('Test Room-based Websocket calls', function () {
		it('Division-less', async function () {
			Katie._changer( console.log )
			await Proback.timeout(1500)
		})
	} )

	after( async function () {
		if ( server )
			server.close( function () {
				console.log('Node stopped')
			} )

		if ( socketClaireClient )
			socketClaireClient.close()
		if ( socketMarieClient )
			socketMarieClient.close()
	})

} )
