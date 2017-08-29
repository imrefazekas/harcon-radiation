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
let httphelper = Rest.httphelper()

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
				marie: {greetings: 'Hi!'}
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

			await harcon.inflicterEntity.addict( null, 'peter', 'greet.*', function (greetings1, greetings2) {
				return Proback.quicker('Hi there!')
			} )
			await harcon.inflicterEntity.addict( null, 'walter', 'greet.*', function (greetings1, greetings2) {
				return Proback.quicker('My pleasure!')
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
			app.use( radiation.rester( rester ) )

			server = http.createServer(app)

			io = await radiation.io( io.listen( server ) )

			socketClient = ioclient( 'http://localhost:8181/KingSocket' )
			socketClient.on('connect', function (data) {
				console.log('Connected to KingSocket')
			} )
			socketClient.on('mood', function (data) {
				console.log('MOOODDDDD >>>>>>>>>>>>>> Shifted:::', data)
			} )
			socketJSONRPCClient = ioclient( 'http://localhost:8181/RPCTwo' )
			socketJSONRPCClient.on('connect', function (data) {
				console.log('Connected to RPCTwo')
			} )
			socketJSONRPCClient.on('mood', function (data) {
				console.log('Json-Rpc MOOODDDDD >>>>>>>>>>>>>> Shifted:::', data)
			} )


			let port = process.env.PORT || 8181

			server.listen( port, () => {
				console.log( 'Running on http://localhost:' + port)
			} )

			await Proback.timeout(3000)
		} catch (err) {
			console.error( err )
			assert.fail( err )
		}
	})
	/*
	describe('System checks', function () {
		it('URIs', async function () {
			let uris = await radiation.entityURIs( )
			// console.log( 'entityURIs>>>>>', JSON.stringify(uris) )
		} )
	} )

	describe('Test Websocket calls', function () {
		it('Division-less', function (done) {
			let mID = clerobee.generate()

			socketClient.emit('ignite', { id: mID, division: 'King', event: 'greet.simple', parameters: [ 'Bonjour!', 'Salut!' ] } )
			socketClient.on('success', function (data) {
				if ( data.id === mID ) {
					expect( data.result ).to.eql( 'Bonjour!' )
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
					expect( data.result ).to.eql( [ 'Hi there!', 'My pleasure!' ] )
					done( )
				}
			})
			socketJSONRPCClient.on('failure', function (data) {
				if ( data.id === mID )
					done( new Error(data) )
			})
		})
	})
	*/

	/*
	describe('Test REST calls', function () {
		it('Division-less', function (done) {
			httphelper.generalCall( 'http://localhost:8181/King/morning/wakeup', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Thanks. Helloka!' )

					done( )
				}
			)
		})

		it('Division-cared', function (done) {
			httphelper.generalCall( 'http://localhost:8181/King/charming/morning/greetings', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Merci bien. Szióka!' )

					done( )
				}
			)
		})

		it('Division-cared with terms', function (done) {
			httphelper.generalCall( 'http://localhost:8181/King/charming/morning/terminus', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Merci bien. Szióka!' )

					done( )
				}
			)
		})

		it('Harcon-RPC', function (done) {
			httphelper.generalCall( 'http://localhost:8181/Harcon', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { division: 'King.charming', event: 'marie.terminus', params: ['Szióka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Merci bien. Szióka!' )

					done( )
				}
			)
		})

		it('JSON-RPC 2.0', function (done) {
			let mID = clerobee.generate()
			httphelper.generalCall( 'http://localhost:8181/RPCTwo', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { id: mID, jsonrpc: '2.0', division: 'King', method: 'julie.wakeup', params: ['Szióka!'] }, 'application/json', logger,
				function (err, data, status) {
					should.not.exist(err)
					should.exist(data)
					expect( data.result ).to.equal( 'Thanks. Szióka!' )

					done( )
				}
			)
		})

		// unhandler promise appeared ...
		it('Test Revoke', function (done) {
			harcon.detracts( julie )
				.then( () => {
					httphelper.generalCall( 'http://localhost:8181/King/morning/wakeup2', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
						function (err, result, status) {
							should.not.exist( err )
							expect( status.statusCode ).to.equal( 404 )
							done( )
						}
					)
				} )
				.catch( (reason) => { done(reason) } )
		})

		it('Mimic-test', function (done) {
			let invisibleDef = fs.readFileSync( path.join(__dirname, 'Invisible.js'), 'utf8' )
			httphelper.generalCall( 'http://localhost:8181/King/Mimesis/mimic', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: [ invisibleDef ] }, 'application/json', logger, function (err, result, status) {
				console.log('.............', err, result, status)

				should.not.exist(err)
				httphelper.generalCall( 'http://localhost:8181/King/Invisible/greet', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: [ 'Hello!' ] }, 'application/json', logger, function (err, result, status) {
					console.log('.............', err, result, status)
					should.not.exist(err)
					expect( result ).to.include( 'Hello!' )
					done( )
				} )

			} )
		})
	})

	describe('Test Publishing calls', function () {
		it('Calling Automata', function ( done ) {
			let mID = clerobee.generate()
			httphelper.generalCall( 'http://localhost:8181/RPCTwo', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { id: mID, jsonrpc: '2.0', division: 'King', method: 'julie.wakeup', params: [ 'Bonjour!' ] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					// expect( result ).to.include( 'Done.' )

					done( )
				}
			)
		})
	})
	*/
	after(function () {
		/*
		if ( socketClient )
			socketClient.disconnect()
		if ( socketJSONRPCClient )
			socketJSONRPCClient.disconnect()
		if ( harcon )
			harcon.close()
		if ( server )
			server.close( function () {
				console.log('Node stopped')
				done()
			} )
		else
			done()
		*/
	})
})
