const assert = require('assert')
const { promisify } = require('util')
let chai = require('chai'),
	should = chai.should(),
	expect = chai.expect

let Server = require('../util/Server')
let server

const request = require('request')
const WebSocket = require('ws')
// const wsEvents = require('ws-events')
let socketClient

let fs = require('fs')
let path = require('path')

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
			name: 'King',
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
				marie: {greetings: 'Hi!'},
				Lina: { situation: 'steady' }
			},
			radiation: {
				name: 'Radiation',
				rest: { ignoreRESTPattern: false, jsonrpcPath: '/RPCTwo', harconrpcPath: '/Harcon' },
				websocket: { harconPath: '/KingSocket', jsonrpcPath: '/RPCTwo' },
				mimesis: { enabled: true },
				distinguish: '-Distinguished'
			}
		} )

		try {
			await server.init()

			await Proback.timeout(1000)

			await server.harcon.inflicterEntity.addict( null, 'peter', 'greet.*', async function (greetings1, greetings2) {
				return 'Hi there!'
			} )
			await server.harcon.inflicterEntity.addict( null, 'walter', 'greet.*', async function (greetings1, greetings2) {
				return 'My pleasure!'
			} )
			await server.harcon.inflicterEntity.addicts( {
				name: 'Katie',
				rest: true,
				websocket: true,
				terminus: async function (greetings, terms, ignite) {
					return terms.request.remoteAddress
				}
			} )

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

			socketClient = new WebSocket('ws://localhost:8080/KingSocket')
			// socketClient = wsEvents( new WebSocket('ws://localhost:8080/KingSocket') )
			socketClient.on('open', function open () {
				console.log('Connected to KingSocket')
			})
			socketClient.on('message', function incoming (data) {
				data = JSON.parse( data )
				if ( data.state )
					console.log('MOOOOOOODD >>>>>>>>>>>>>> ', data)
			})

			await Proback.timeout(3000)
		} catch (err) {
			console.error( err )
			assert.fail( err )
		}
	})
	describe('System checks', function () {
		it('URIs', async function () {
			let uris = await server.radiation.entityURIs( )
			console.log( 'entityURIs>>>>>', JSON.stringify(uris) )
		} )
	} )

	describe('parallelism', function () {
		it('Alize silent', async function () {
			this.timeout(15000)

			await Proback.timeout( 5000 )
			for (let i = 1; i <= 1; ++i) {
				await Proback.timeout( i * 25 )

				let time = Date.now()
				post( 'http://localhost:8080/Harcon', { division: 'King', event: 'Alizee.silent', params: [ ] } ).then( (res) => {
					console.log( (Date.now() - time) + ' :: ' + res )
				} ) .catch( console.error )
			}
			await Proback.timeout( 5000 )
		})
	})

	describe('Test Websocket calls', function () {
		it('Division-less', function (done) {
			let mID = clerobee.generate()

			socketClient.send( JSON.stringify( { id: mID, division: 'King', event: 'greet.simple', parameters: [ 'Bonjour!', 'Salut!' ] } ) )
			socketClient.on('message', function (data) {
				data = JSON.parse( data )
				if ( data.error )
					done( new Error(data.error) )
				else if ( data.id === mID ) {
					expect( data.result ).to.include( 'Bonjour!', 'Hi there!', 'My pleasure!' )
					done( )
				}
			} )
		})
		it('Division-cared', function (done) {
			let mID = clerobee.generate()
			socketClient.send( JSON.stringify( { id: mID, division: 'King.maison.cache', event: 'Margot.alors', parameters: [ ] } ) )
			socketClient.on('message', function (data) {
				data = JSON.parse( data )
				if ( data.error )
					done( new Error(data.error) )
				if ( data.id === mID ) {
					expect( data.result ).to.eql( 'Oui?' )
					done( )
				}
			})
		})
		it('JSON-RPC 2.0', function (done) {
			let mID = clerobee.generate()
			socketClient.send( JSON.stringify( { jsonrpc: '2.0', division: 'King', method: 'Julie.wakeup', params: [ ], id: mID } ) )
			socketClient.on('message', function (data) {
				data = JSON.parse( data )
				if ( data.error )
					done( new Error(data.error) )
				if ( data.id === mID ) {
					expect( data.result ).to.include( 'Hi there!', 'My pleasure!' )
					done( )
				}
			})
		})
	})

	describe('Test REST calls', function () {
		it('Division-less', async function () {
			try {
				let res = await post( 'http://localhost:8080/King/morning/wakeup', { params: [ ] } )
				should.exist(res.body)
				should.equal(res.response.statusCode, 200)
				expect( res.body ).to.include( 'Hi there!', 'My pleasure!' )
			} catch (err) { assert.fail( err ) }
		})
		it('Division-cared', async function () {
			try {
				let result = await post( 'http://localhost:8080/King.click/greet/simple', { params: [ 'Szióka!', 'Ciao' ] } )
				should.exist(result.body)
				should.equal(result.response.statusCode, 200)
				expect( result.body ).to.include( 'Hi there!', 'My pleasure!', 'Pas du tout!', 'Bonjour!' )
			} catch (err) { assert.fail( err ) }
		})
		it('Division-cared with terms', async function () {
			try {
				let result = await post( 'http://localhost:8080/King/Katie/terminus', { params: [ 'Szióka!' ] } )
				should.exist(result.body)
				should.equal(result.response.statusCode, 200)
				expect( result.body ).to.eql( '127.0.0.1' )
			} catch (err) { assert.fail( err ) }
		})
		it('Harcon-RPC', async function () {
			try {
				let result = await post( 'http://localhost:8080/Harcon', { division: 'King.click', event: 'Claire.jolie', params: ['Szióka!'] } )
				should.exist(result.body)
				should.equal(result.response.statusCode, 200)
				expect( result.body ).to.eql( 'Merci' )
			} catch (err) { assert.fail( err ) }
		})
		it('JSON-RPC 2.0', async function () {
			let mID = clerobee.generate()
			try {
				let result = await post( 'http://localhost:8080/RPCTwo', { id: mID, jsonrpc: '2.0', division: 'King', method: 'Julie.rever', params: ['Szióka!'] } )
				should.exist( result.body )
				should.equal(result.response.statusCode, 200)
				expect( result.body.result ).to.equal( 'Non, Mais non!' )
			} catch (err) { assert.fail( err ) }
		})
		it('Test Revoke', async function () {
			await server.harcon.detracts( { name: 'Julie' } )
			try {
				let result = await post( 'http://localhost:8080/King/morning/wakeup', { params: ['Helloka!'] } )
				expect( result.response.statusCode ).to.equal( 500 )
			} catch (err) { assert.fail( err ) }
		})
		it('Mimic-test', async function () {
			let invisibleDef = fs.readFileSync( path.join(__dirname, 'Invisible.js'), 'utf8' )
			try {
				await post( 'http://localhost:8080/King/Mimesis/mimic', { params: [ invisibleDef ] } )
				let result = await post( 'http://localhost:8080/King/Invisible/greet', { params: [ 'Hello!' ] } )
				expect( result.body ).to.include( 'Hello!' )
			} catch (err) { assert.fail( err ) }
		})
	})

	after( async function () {
		if ( server )
			server.close( function () {
				console.log('Node stopped')
			} )

		if (socketClient)
			socketClient.close()
	})
})
