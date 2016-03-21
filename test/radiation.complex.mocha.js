'use strict'

let http = require('http')

let connect = require('connect')

let Harcon = require('harcon')
let Radiation = require('../lib/harcon-radiation')

let Logger = require('./WinstonLogger')
let logger = Logger.createWinstonLogger( { console: true } )

let io = require('socket.io')
let ioclient = require('socket.io-client')

let socketClaireClient, socketMarieClient
let harcon, radiation, server

let julie

let async = require('async')

let Cerobee = require('clerobee')
let clerobee = new Cerobee( 16 )


let authAssigner = function (event) {
	if (event === 'Julie.login')
		return function ( err, name, socket, callback ) {
			console.log('>>>>>>>>>>', err, name[0])
			socket.name = name[0]
			socket.join( name[0] )
			callback( err, name )
		}
	return function ( err, res, socket, callback ) {
		callback( err, res )
	}
}

describe('harcon-radiation', function () {

	before(function (done) {
		this.timeout(5000)
		harcon = new Harcon( { name: 'Queen', logger: logger, idLength: 32 }, function (err) {
			if (err) return done(err)

			let fns = []
			fns.push(function (cb) {
				radiation = new Radiation( harcon, {
					name: 'Radiation',
					websocket: { socketPath: '/QueenSocket', jsonrpcPath: '/RPCTwo' },
					assignSocket: authAssigner
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

				cb()
			})
			fns.push(function (cb) {
				julie = {
					name: 'Julie',
					context: 'morning',
					rest: true,
					websocket: true,
					login: function (name, callback) {
						console.log('\n! Login: ', name, '!\n')
						callback(null, name)
					},
					_changer: function ( callback ) {
						let message = 'C\'est la vie'
						this.shifted( { mood: message }, '*' )
						this.shifted( { mood: 'Pour toi, Marie' }, 'Marie' )
						this.shifted( { mood: 'Pour toi, Claire' }, 'Claire' )
						this.shifted( { mood: 'C\'est fini, Marie' }, {name: 'Marie'} )
						callback( null, message )
					}
				}
				harcon.addicts( julie, {}, cb )
			})
			fns.push(function (cb) {
				let app = connect()

				server = http.createServer(app)

				io = radiation.io( io.listen( server ) )

				cb()
			})
			fns.push(function (cb) {
				let port = process.env.PORT || 8080
				server.listen( port, function () {
					console.log( 'Running on http://localhost:' + port)
					setTimeout( function () {
						cb()
					}, 1000 )
				})
			})
			fns.push(function (cb) {
				let mID = clerobee.generate()
				socketClaireClient = ioclient( 'http://localhost:8080/QueenSocket' )
				socketClaireClient.on('connect', function (data) {
					console.log('Connected to QueenSocket')
					socketClaireClient.emit('ignite', { id: mID, division: 'Queen', event: 'Julie.login', parameters: [ 'Claire' ] } )
					cb()
				} )
				socketClaireClient.on('mood', function (data) {
					console.log('MOOODDDDD >>>>>>>>>>>>>> Shifted:::', data)
				} )
			})
			fns.push(function (cb) {
				let mID = clerobee.generate()
				socketMarieClient = ioclient( 'http://localhost:8080/RPCTwo' )
				socketMarieClient.on('connect', function (data) {
					console.log('Connected to RPCTwo')
					socketMarieClient.emit('ignite', { jsonrpc: '2.0', id: mID, division: 'Queen', method: 'Julie.login', params: [ 'Marie' ] } )
					cb()
				} )
				socketMarieClient.on('mood', function (data) {
					console.log('MOOODDDDD >>>>>>>>>>>>>> Shifted:::', data)
				} )
			} )
			async.series( fns, function ( err, res ) {
				done( err )
			} )
		} )
	} )

	describe('System checks', function () {
		it('URIs', function (done) {
			radiation.entityURIs( function ( err, uris ) {
				console.log( err, JSON.stringify(uris) )
				done()
			} )
		} )
	} )

	describe('Test Room-based Websocket calls', function () {
		it('Division-less', function (done) {
			julie._changer( console.log )
			setTimeout( function () {
				done()
			}, 1500 )
		})
	} )

	after(function (done) {
		if ( socketClaireClient )
			socketClaireClient.disconnect()
		if ( socketMarieClient )
			socketMarieClient.disconnect()
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

} )
