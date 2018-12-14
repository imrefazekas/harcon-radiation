let fastify

let path = require('path')

let Assigner = require('assign.js')
let assigner = new Assigner()

let Harcon = require('harcon')
let Radiation = require('../lib/harcon-radiation')

let DefaultConfig = require('./DefaultConfig')

function Server (config = {}) {
	let self = this

	let appName = config.NODE_APP_NAME || config.name || config.appName || 'Harcon'
	config.logger = config.logger || require('./PinoLogger').createPinoLogger( appName, { level: 'info' } )
	let logger = config.logger

	self.config = assigner.assign( {}, DefaultConfig.newConfig( logger, config ), config )
	self.logger = logger

	if ( self.config.server.active ) {
		let fastifyConfig = assigner.assign( {
			logger: true
			// logger: self.logger
		}, self.config.fastify )

		fastify = require('fastify')( fastifyConfig )

		fastifyConfig.defaultPlugins( fastify )

		fastifyConfig.plugins( fastify )
	}
}

let server = Server.prototype

server.setupTerminationHandlers = function () {
	let self = this

	process.on('SIGINT', function () {
		let timeout = 0
		if ( self.config.server.forcefulShutdown > 0 )
			timeout = setTimeout( () => {
				process.exit( 1 )
			}, self.config.server.forcefulShutdown )

		console.log('%s: Node server stopped.', new Date() )
		self.close().then( () => {
			clearTimeout( timeout )
			process.exit( 0 )
		} ).catch( (err) => {
			clearTimeout( timeout )
			console.error(err)
			process.exit( 1 )
		} )
	})
}

/*
plugins (from the Fastify ecosystem)
└── your plugins (your custom plugins)
└── decorators
└── hooks and middlewares
└── your services
*/
server.init = async function (callback) {
	let self = this

	let appName = self.config.NODE_APP_NAME || self.config.name || self.config.appName
	let subDivision = self.config.NODE_SUB_DIVISION || self.config.subDivision || ''
	let channelConfig = {
		name: appName,
		subDivision: subDivision,
		logger: self.logger,
		millieu: self.config.millieu || {}
	}
	let iopts = assigner.assign( {}, self.config.harcon, channelConfig )
	let harcon = new Harcon( iopts )
	let inflicter = await harcon.init()

	self.harcon = inflicter

	self.setupTerminationHandlers()

	if (self.config.server.radiation) {
		self.radiation = new Radiation( self.harcon, self.config.radiation )
		await self.radiation.init( )

		if (self.config.server.rest)
			await self.radiation.rester( fastify )
		if (self.config.server.ws)
			await self.radiation.ws( fastify )
	}

	if ( self.config.server.active ) {
		if (self.config.fastify.routes)
			await self.config.fastify.routes( fastify )

		let portToMap = self.config.NODE_SERVER_PORT || self.config.server.port || 8080
		let ipToMap = self.config.NODE_SERVER_IP || self.config.server.ip || '0.0.0.0'
		await fastify.listen(portToMap, ipToMap)

		self.logger.info( `Server is listening on ${fastify.server.address().port}` )
	}

	console.log( '\n\n\n\n------------', fastify.printRoutes())

	return self
}

server.close = async function ( ) {
	let self = this

	if ( self.harcon )
		await self.harcon.close( )

	if ( fastify ) {
		await fastify.close( )
		fastify = null
		console.log('HTTP(S) stopped')
	}

	if ( self.config.server.close )
		await self.config.server.close()
}

module.exports = Server
