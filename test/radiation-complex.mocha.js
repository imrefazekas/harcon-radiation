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

let io = require('socket.io')
let ioclient = require('socket.io-client')
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

let authAssigner = function (event) {
	if (event === 'Katie.login')
		return async function ( terms, name, socket ) {
			socket.name = name[0]
			socket.join( name[0] )
			return name
		}
	return function ( terms, res, socket ) {
		return res
	}
}

describe('harcon-radiation', function () {

	before( async function () {
		this.timeout(5000)
		try {
			let harconPath = path.join( process.cwd(), 'node_modules', 'harcon', 'test' )
			harcon = new Harcon( {
				name: 'Queen',
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
				websocket: { harconPath: '/QueenSocket', jsonrpcPath: '/RPCTwo' },
				assignSocket: authAssigner,
				distinguish: '-Distinguished'
			} )
			await radiation.init( )

			await Proback.timeout(1000)

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
					this.shifted( { mood: message }, '*' )
					this.shifted( { mood: 'Pour toi, Marie' }, 'Marie' )
					this.shifted( { mood: 'Pour toi, Claire' }, 'Claire' )
					this.shifted( { mood: 'C\'est fini, Marie' }, {name: 'Marie'} )
					return message
				}
			}
			await harcon.inflicterEntity.addicts( Katie )

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

			let port = process.env.PORT || 8282

			server.listen( port, () => {
				console.log( 'Running on http://localhost:' + port)
			} )

			await Proback.timeout(1000)

			socketClaireClient = ioclient( 'http://localhost:' + port + '/QueenSocket' )
			socketClaireClient.on('connect', async function (data) {
				console.log('Connected to QueenSocket')
				await socketClaireClient.emit('ignite', { id: clerobee.generate(), division: 'Queen', event: 'Katie.login', parameters: [ 'Claire' ] } )
			} )
			socketClaireClient.on('success', function (data) {
			} )
			socketClaireClient.on('mood', function (data) {
				console.log('MOOODDDDD Socket >>>>>>>>>>>>>> Shifted:::', data)
			} )

			socketMarieClient = ioclient( 'http://localhost:' + port + '/RPCTwo' )
			socketMarieClient.on('connect', async function (data) {
				console.log('Connected to RPCTwo')
				await socketMarieClient.emit('ignite', { jsonrpc: '2.0', id: clerobee.generate(), division: 'Queen', method: 'Katie.login', params: [ 'Marie' ] } )
			} )
			socketMarieClient.on('success', function (data) {
			} )
			socketMarieClient.on('mood', function (data) {
				console.log('MOOODDDDD RPC >>>>>>>>>>>>>> Shifted:::', data)
			} )

			await Proback.timeout(1000)
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
		if ( socketClaireClient )
			socketClaireClient.disconnect()
		if ( socketMarieClient )
			socketMarieClient.disconnect()
		if ( harcon )
			await harcon.close()
		if ( server )
			server.close( function () {
				console.log('Node stopped')
			} )
	})

} )
