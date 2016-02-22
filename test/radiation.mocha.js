'use strict'

let chai = require('chai'),
	should = chai.should(),
	expect = chai.expect
let http = require('http')

let connect = require('connect')
let bodyParser = require('body-parser')

let Harcon = require('harcon')

let Radiation = require('../lib/harcon-radiation')

let Logger = require('./WinstonLogger')
let logger = Logger.createWinstonLogger( { console: true } )

let harcon, radiation, server, julie, marie

let Rest = require('connect-rest')
let httphelper = Rest.httphelper()

let io = require('socket.io')
let ioclient = require('socket.io-client')
let socketClient, socketJSONRPCClient

let fs = require('fs')
let path = require('path')
let Publisher = require('./Publisher')

let async = require('async')

let Cerobee = require('clerobee')
let clerobee = new Cerobee( 16 )


describe('harcon-radiation', function () {

	before(function (done) {
		harcon = new Harcon( { name: 'King', logger: logger, idLength: 32, marie: {greetings: 'Hi!'} }, function (err) {
			if (err) return done(err)

			let fns = []
			fns.push(function (cb) {
				radiation = new Radiation( harcon, {
					name: 'Radiation',
					rest: { jsonrpcPath: '/RPCTwo', harconrpcPath: '/Harcon' },
					websocket: { socketPath: '/KingSocket', jsonrpcPath: '/RPCTwo' },
					mimesis: { enabled: true }
				} )
				radiation.init( cb )
			})
			fns.push(function (cb) {
				radiation.listen( {
					shifted: function ( radiation, object ) {
						console.log( 'shifted', object )
					},
					posted: function ( radiation, request ) {
						console.log( 'posted', request )
					},
					ioCreacted: function ( radiation, namespaceSocker ) {
						console.log( 'ioCreacted', namespaceSocker )
					},
					ioConnected: function ( radiation, socket ) {
						console.log( 'ioConnected' )
					}
				} )

				julie = {
					name: 'julie',
					context: 'morning',
					rest: true,
					websocket: true,
					wakeup: function ( greetings, ignite, callback ) {
						this.shifted( { mood: 'happy' } )
						callback( null, 'Thanks. ' + greetings )
					}
				}
				marie = {
					name: 'marie',
					division: 'charming',
					context: 'morning',
					rest: true,
					websocket: true,
					greetings: function ( greetings, ignite, callback ) {
						callback( null, 'Merci bien. ' + greetings )
					},
					terminus: function ( greetings, terms, ignite, callback ) {
						console.log('TERMS::', terms)
						callback( null, 'Merci bien. ' + greetings )
					}
				}
				cb()
			})
			fns.push(function (cb) {
				harcon.addicts( julie, {}, cb )
			})
			fns.push(function (cb) {
				harcon.addicts( marie, {}, cb )
			})
			fns.push(function (cb) {
				let app = connect()
					.use( bodyParser.urlencoded( { extended: true } ) )
					.use( bodyParser.json() )

				let options = {
					context: '/api',
					logger: logger,
					apiKeys: [ '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9' ],
					discoverPath: 'discover',
					protoPath: 'proto'
				}
				let rester = Rest.create( options )
				app.use( radiation.rester( rester ) )

				server = http.createServer(app)

				io = radiation.io( io.listen( server ) )

				// harcon.addicts( julie ) harcon.addicts( marie )

				socketClient = ioclient( 'http://localhost:8080/KingSocket' )
				socketClient.on('connect', function (data) {
					console.log('Connected to KingSocket')
				} )
				socketClient.on('mood', function (data) {
					console.log('>>>>>>>>>>>>>> Shifted:::', data)
				} )
				socketJSONRPCClient = ioclient( 'http://localhost:8080/RPCTwo' )
				socketJSONRPCClient.on('connect', function (data) {
					console.log('Connected to RPCTwo')
				} )

				harcon.addicts( Publisher, {}, cb )
			} )
			fns.push(function (cb) {
				let port = process.env.PORT || 8080
				Publisher.watch( path.join(__dirname, 'comps'), -1 )

				server.listen( port, function () {
					console.log( 'Running on http://localhost:' + port)
					done()
				})
			})
			async.series( fns, function ( err, res ) {
				done( err )
			} )
		} )

	})

	describe('Test Websocket calls', function () {
		it('Division-less', function (done) {
			let mID = clerobee.generate()
			socketClient.emit('ignite', { id: mID, division: 'King', event: 'morning.wakeup', parameters: [ 'Helloka!' ] } )
			socketClient.on('done', function (data) {
				if ( data.id === mID ) {
					expect( data.result ).to.include( 'Thanks. Helloka!' )
					done( )
				}
			})
			socketClient.on('error', function (data) {
				if ( data.id === mID )
					done( new Error(data) )
			})
		})

		it('Division-cared', function (done) {
			let mID = clerobee.generate()
			socketClient.emit('ignite', { id: mID, division: 'King.charming', event: 'morning.greetings', parameters: [ 'Szióka!' ] } )
			socketClient.on('done', function (data) {
				if ( data.id === mID ) {
					expect( data.result ).to.include( 'Merci bien. Szióka!' )
					done( )
				}
			})
			socketClient.on('error', function (data) {
				if ( data.id === mID )
					done( new Error(data) )
			})
		})
		it('JSON-RPC 2.0', function (done) {
			let mID = clerobee.generate()
			socketJSONRPCClient.emit('ignite', { jsonrpc: '2.0', method: 'julie.wakeup', params: [ 'Bonjour!' ], id: mID } )
			socketJSONRPCClient.on('done', function (data) {
				done( )
				if ( data.id === mID ) {
					expect( data.result ).to.include( 'Merci bien. Szióka!' )
					done( )
				}
			})
			socketJSONRPCClient.on('error', function (data) {
				if ( data.id === mID )
					done( new Error(data) )
			})
		})

	})


	describe('Test REST calls', function () {
		it('Division-less', function (done) {
			httphelper.generalCall( 'http://localhost:8080/King/morning/wakeup', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Thanks. Helloka!' )

					done( )
				}
			)
		})
		it('Division-cared', function (done) {
			httphelper.generalCall( 'http://localhost:8080/King/charming/morning/greetings', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Merci bien. Szióka!' )

					done( )
				}
			)
		})

		it('Division-cared with terms', function (done) {
			httphelper.generalCall( 'http://localhost:8080/King/charming/morning/terminus', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					expect( result ).to.include( 'Merci bien. Szióka!' )

					done( )
				}
			)
		})

		it('Harcon-RPC', function (done) {
			httphelper.generalCall( 'http://localhost:8080/Harcon', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { division: 'King.charming', event: 'marie.terminus', params: ['Szióka!'] }, 'application/json', logger,
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
			httphelper.generalCall( 'http://localhost:8080/RPCTwo', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { id: mID, jsonrpc: '2.0', method: 'julie.wakeup', params: ['Szióka!'] }, 'application/json', logger,
				function (err, data, status) {
					should.not.exist(err)
					should.exist(data)
					expect( data.result ).to.equal( 'Thanks. Szióka!' )

					done( )
				}
			)
		})

		it('Test Revoke', function (done) {
			harcon.detracts( julie, function (err) {
				if (err) return done(err)
				httphelper.generalCall( 'http://localhost:8080/King/morning/wakeup', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
					function (err, result, status) {
						should.not.exist( err )
						expect( status.statusCode ).to.equal( 404 )
						done( )
					}
				)
			} )
		})

		it('Mimic-test', function (done) {
			let invisibleDef = fs.readFileSync( path.join(__dirname, 'Invisible.js'), 'utf8' )
			httphelper.generalCall( 'http://localhost:8080/King/Nimesis/mimic', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: [ invisibleDef ] }, 'application/json', logger, function (err, result, status) {

				should.not.exist(err)
				httphelper.generalCall( 'http://localhost:8080/King/Invisible/greet', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: [ 'Hello!' ] }, 'application/json', logger, function (err, result, status) {
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
			httphelper.generalCall( 'http://localhost:8080/RPCTwo', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { id: mID, jsonrpc: '2.0', method: 'julie.wakeup', params: [ 'Bonjour!' ] }, 'application/json', logger,
				function (err, result, status) {
					should.not.exist(err)
					should.exist(result)

					// expect( result ).to.include( 'Done.' )

					done( )
				}
			)
		})
	})

	after(function (done) {
		if ( socketClient )
			socketClient.disconnect()
		if ( socketJSONRPCClient )
			socketJSONRPCClient.disconnect()
		if ( server )
			server.close( function () {
				console.log('Node stopped')
				done()
			} )
		if ( harcon )
			harcon.close()
		if ( !server )
			done()
	})
})
