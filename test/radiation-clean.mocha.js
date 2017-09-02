const assert = require('assert')
const { promisify } = require('util')
let chai = require('chai'),
	should = chai.should(),
	expect = chai.expect
let http = require('http')

let connect = require('connect')
let bodyParser = require('body-parser')

let Harcon = require('harcon')

let Radiation = require('../lib/harcon-radiation')

let Logger = require('./PinoLogger')
let logger = Logger.createPinoLogger( { level: 'info' } )

let harcon, radiation, server

let Rest = require('connect-rest')
let httphelper = Rest.httphelper( {
}, {
	headers: {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}
} )

let io = require('socket.io')
let ioclient = require('socket.io-client')
let socketClient, socketJSONRPCClient

let fs = require('fs')
let path = require('path')

let Cerobee = require('clerobee')
let clerobee = new Cerobee( 16 )

let Proback = require('proback.js')

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, ' .... reason:', reason)
})

describe('harcon-radiation', function () {

	before( async function () {
		this.timeout(5000)
		try {
			let harconPath = path.join( process.cwd(), 'node_modules', 'harcon', 'test' )
			harcon = new Harcon( {
				name: 'King',
				logger: logger,
				idLength: 32,
				mortar: {
					enabled: true,
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
			} )
			harcon = await harcon.init()
			radiation = new Radiation( harcon, {
				name: 'Radiation',
				rest: { jsonrpcPath: '/RPCTwo', harconrpcPath: '/Harcon' },
				websocket: { harconPath: '/KingSocket', jsonrpcPath: '/RPCTwo' },
				mimesis: { enabled: true },
				distinguish: '-Distinguished'
			} )
			await radiation.init( )

			await Proback.timeout(1000)

			await harcon.inflicterEntity.addict( null, 'peter', 'greet.*', async function (greetings1, greetings2) {
				return 'Hi there!'
			} )
			await harcon.inflicterEntity.addict( null, 'walter', 'greet.*', async function (greetings1, greetings2) {
				return 'My pleasure!'
			} )
			await harcon.inflicterEntity.addicts( {
				name: 'Katie',
				rest: true,
				websocket: true,
				terminus: async function (greetings, terms, ignite) {
					return terms.request.headers.clientAddress
				}
			} )

			await radiation.listen( {
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

			let app = connect()
				.use( bodyParser.urlencoded( { extended: true } ) )
				.use( bodyParser.json() )

			let options = {
				context: '/api',
				logger: logger,
				apiKeys: [ '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9' ]
			}
			let rester = Rest.create( options )
			app.use( await radiation.rester( rester ) )

			server = http.createServer(app)

			io = await radiation.io( io.listen( server ) )

			let port = process.env.PORT || 8181

			server.listen( port, () => {
				console.log( 'Running on http://localhost:' + port)
			} )

			socketClient = ioclient( 'http://localhost:' + port + '/KingSocket' )
			socketClient.on('connect', function (data) {
				console.log('Connected to KingSocket')
			} )
			socketClient.on('mood', function (data) {
				console.log('MOOODDDDD >>>>>>>>>>>>>> Shifted:::', data)
			} )
			socketJSONRPCClient = ioclient( 'http://localhost:' + port + '/RPCTwo' )
			socketJSONRPCClient.on('connect', function (data) {
				console.log('Connected to RPCTwo')
			} )
			socketJSONRPCClient.on('mood', function (data) {
				console.log('Json-Rpc MOOODDDDD >>>>>>>>>>>>>> Shifted:::', data)
			} )

			await Proback.timeout(3000)
		} catch (err) {
			console.error( err )
			assert.fail( err )
		}
	})

	describe('System checks', function () {
		it('URIs', async function () {
			let uris = await radiation.entityURIs( )
			console.log( 'entityURIs>>>>>', JSON.stringify(uris) )
		} )
	} )

	describe('Test Websocket calls', function () {
		it('Division-less', function (done) {
			let mID = clerobee.generate()

			socketClient.emit('ignite', { id: mID, division: 'King', event: 'greet.simple', parameters: [ 'Bonjour!', 'Salut!' ] } )
			socketClient.on('success', function (data) {
				if ( data.id === mID ) {
					expect( data.result ).to.include( 'Bonjour!', 'Hi there!', 'My pleasure!' )
					done( )
				}
			})
			socketClient.on('failure', function (data) {
				if ( data.id === mID ) {
					done( new Error(data.message) )
				}
			})
		})
		it('Division-cared', function (done) {
			let mID = clerobee.generate()
			socketClient.emit('ignite', { id: mID, division: 'King.maison.cache', event: 'Margot.alors', parameters: [ ] } )
			socketClient.on('success', function (data) {
				if ( data.id === mID ) {
					expect( data.result ).to.eql( 'Oui?' )
					done( )
				}
			})
			socketClient.on('failure', function (data) {
				if ( data.id === mID )
					done( new Error(data) )
			})
		})
		it('JSON-RPC 2.0', function (done) {
			let mID = clerobee.generate()
			socketJSONRPCClient.emit('ignite', { jsonrpc: '2.0', division: 'King', method: 'Julie.wakeup', params: [ ], id: mID } )
			socketJSONRPCClient.on('success', function (data) {
				if ( data.id === mID ) {
					expect( data.result ).to.include( 'Hi there!', 'My pleasure!' )
					done( )
				}
			})
			socketJSONRPCClient.on('failure', function (data) {
				if ( data.id === mID )
					done( new Error(data) )
			})
		})
	})

	describe('Test REST calls', function () {
		it('Division-less', async function () {
			try {
				let result = await httphelper.post( 'http://localhost:8181/King/morning/wakeup', null, { params: [ ] } )
				should.exist(result.result)
				should.equal(result.status.statusCode, 200)
				expect( result.result ).to.include( 'Hi there!', 'My pleasure!' )
			} catch (err) { assert.fail( err ) }
		})
		it('Division-cared', async function () {
			try {
				let result = await httphelper.post( 'http://localhost:8181/King/click/greet/simple', null, { params: ['Szióka!', 'Ciao'] } )
				should.exist(result.result)
				should.equal(result.status.statusCode, 200)
				expect( result.result ).to.include( 'Hi there!', 'My pleasure!', 'Pas du tout!', 'Bonjour!' )
			} catch (err) { assert.fail( err ) }
		})
		it('Division-cared with terms', async function () {
			try {
				let result = await httphelper.post( 'http://localhost:8181/King/Katie/terminus', null, { params: ['Szióka!'] } )
				should.exist(result.result)
				should.equal(result.status.statusCode, 200)
				expect( result.result ).to.eql( '::ffff:127.0.0.1' )
			} catch (err) { assert.fail( err ) }
		})
		it('Harcon-RPC', async function () {
			try {
				let result = await httphelper.post( 'http://localhost:8181/Harcon', null, { division: 'King.click', event: 'Claire.jolie', params: ['Szióka!'] } )
				should.exist(result)
				should.equal(result.status.statusCode, 200)
				expect( result.result ).to.eql( 'Merci' )
			} catch (err) { assert.fail( err ) }
		})
		it('JSON-RPC 2.0', async function () {
			let mID = clerobee.generate()
			try {
				let result = await httphelper.post( 'http://localhost:8181/RPCTwo', null, { id: mID, jsonrpc: '2.0', division: 'King', method: 'Julie.rever', params: ['Szióka!'] } )
				should.exist( result.result )
				should.equal(result.status.statusCode, 200)
				expect( result.result.result ).to.equal( 'Non, Mais non!' )
			} catch (err) { assert.fail( err ) }
		})
		it('Test Revoke', async function () {
			await harcon.detracts( { name: 'Julie' } )
			try {
				let result = await httphelper.post( 'http://localhost:8181/King/morning/wakeup2', null, { params: ['Helloka!'] } )
				expect( result.status.statusCode ).to.equal( 404 )
			} catch (err) { assert.fail( err ) }
		})
		it('Mimic-test', async function () {
			let invisibleDef = fs.readFileSync( path.join(__dirname, 'Invisible.js'), 'utf8' )
			try {
				await httphelper.post( 'http://localhost:8181/King/Mimesis/mimic', null, { params: [ invisibleDef ] } )
				let result = await httphelper.post( 'http://localhost:8181/King/Invisible/greet', null, { params: [ 'Hello!' ] } )
				expect( result.result ).to.include( 'Hello!' )
			} catch (err) { assert.fail( err ) }
		})
	})

	after( async function () {
		if ( socketClient )
			socketClient.disconnect()
		if ( socketJSONRPCClient )
			socketJSONRPCClient.disconnect()
		if ( harcon )
			await harcon.close()
		if ( server )
			server.close( function () {
				console.log('Node stopped')
			} )
	})
})
