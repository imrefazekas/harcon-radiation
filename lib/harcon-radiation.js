let _ = require('isa.js')
let Assigner = require('assign.js')
let assigner = new Assigner()

let fs = require('fs')
let path = require('path')

let VERSION = exports.VERSION = JSON.parse( fs.readFileSync( path.join(__dirname, '..', 'package.json'), 'utf8' ) ).version

let DefaultConfig = require('./DefaultConfig')

let Creator = require('./Creator')

// checked
function Radiation ( inflicter, options ) {
	let self = this

	this.deployedServices = []
	this.toREST = [ ]
	this.toWebsocket = [ ]

	assigner.recursive(true)

	self.options = assigner.assign( {}, DefaultConfig.config(inflicter), options || {} )

	inflicter.options.bender.privileged.push( self.options.name )

	self.options.logger.radiationlog = function ( err, message, obj, level ) {
		if (err)
			this[ 'error' ]( assigner.assign( obj || {}, { 'radiation': VERSION } ), err.message || err.toString() )
		else
			this[ level || 'debug' ]( assigner.assign( obj || {}, { 'radiation': VERSION } ), message )
	}.bind( self.options.logger )

	self.listeners = []
	self.notifyListeners = async function ( fnName, params ) {
		for (let listener of self.listeners) {
			if ( listener[ fnName ] && _.isFunction( listener[ fnName ] ) )
				await listener[ fnName ].apply( listener, params )
		}
	}

	this.inflicter = inflicter
}

let radiation = Radiation.prototype

// checked
radiation.entityURIs = function ( ) {
	let self = this
	return new Promise( async (resolve, reject) => {
		try {
			let entities = await self.inflicter.entities( )
			resolve( {
				entities: entities,
				port: self.options.port,
				rest: {
					harconRPC: self.options.rest.harconrpcPath,
					jsonRPC: self.options.rest.jsonrpcPath,
					mappings: self.options.rest.ignoreRESTPattern ? null : (self.REST || [])
				},
				websocket: {
					harconRPC: self.options.websocket.harconPath,
					jsonRPC: self.options.websocket.jsonrpcPath,
					mappings: self.Websocket || []
				},
				deployedServices: self.deployedServices || []
			} )
		} catch (err) { reject(err) }
	} )
}

// checked
radiation.init = function ( ) {
	let self = this

	return new Promise( async (resolve, reject) => {
		try {
			let entity = await self.inflicter.addicts( Creator.newRadiation( self ), {} )

			self.firestarter = self.inflicter.barrel.firestarter( entity.name )

			self.divisions = {}
			if ( self.options.mimesis && self.options.mimesis.enabled )
				await self.inflicter.addicts( Creator.newMimic(self), {} )

			resolve( entity )
		} catch (err) { reject(err) }
	} )
}

radiation._igniteSystemEvent = function () {
	let self = this
	return new Promise( async (resolve, reject) => {
		try {
			if (self.inflicter) {
				var args = [ null, null, self.inflicter.systemFirestarter.division, self.inflicter.systemFirestarter.name + '.' + arguments[0] ]
				for (var i = 1; i < arguments.length; i += 1)
					args.push( arguments[i] )
				await self.inflicter.systemFirestarter.ignite.apply( self.inflicter.systemFirestarter, args )
			}
			resolve( 'ok' )
		} catch (err) { reject(err) }
	} )
}

radiation._readEntity = async function ( entityDef ) {
	let self = this

	let Module = module.constructor
	let m = new Module()
	m._compile(entityDef, 'Mimesis.js')
	let mimicEntity = await self.inflicter.addicts( m.exports, {} )
	return mimicEntity
}

radiation.listen = async function (listener) {
	let self = this
	if ( !listener || !_.isObject( listener ) )
		throw new Error( 'Proper listener object must be passed.' )

	self.listeners.push( listener )

	return listener
}

radiation.ignite = function ( id, terms, division, event, params ) {
	let self = this
	return new Promise( async (resolve, reject) => {
		let knownDivision = (division === self.inflicter.division) || division.startsWith( self.inflicter.division + '.' )
		if ( !knownDivision || self.options.shield(division, event) )
			return reject( new Error('Message has been blocked') )

		try {
			let parameters = [ id, null, division, event ].concat( params )
			self.firestarter.addTerms( id, terms )
			resolve( await self.firestarter.ignite.apply( self.firestarter, parameters ) )
		} catch (err) { reject(err) }
	} )
}

radiation.innerPublish = async function ( firestarter, protocol, publisherFN, service, fName ) {
	let self = this
	return new Promise( async (resolve, reject) => {
		try {
			let address = await publisherFN(firestarter, fName, service)
			if ( address ) {
				self[protocol][ firestarter.name ].push( address )
				self.options.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.options.logLevel )
			}
			resolve('ok')
		} catch (err) { reject(err) }
	} )
}

radiation.publish = function ( firestarter, protocol, publisherFN ) {
	let self = this

	return new Promise( async (resolve, reject) => {
		if ( !self[protocol] )
			return reject( protocol + ' has not been started yet.', firestarter.name )

		if ( self[protocol][ firestarter.name ] )
			return reject( 'Component has been published already.', firestarter.name )

		self[protocol][ firestarter.name ] = []
		self[protocol][ firestarter.name ].firestarter = firestarter

		try {
			for ( let service of firestarter.services() ) {
				if ( !service || ( self.options.hideInnerServices && ( service.startsWith( self.options.innerServicesPrefix ) || self.options.innerServicesFn(service) ) ) )
					continue

				if ( firestarter.context ) {
					await self.innerPublish( firestarter, protocol, publisherFN, service, firestarter.context )
				}
				await self.innerPublish( firestarter, protocol, publisherFN, service, firestarter.name )
			}
			resolve('ok')
		} catch (err) { reject(err) }
	} )
}

radiation.revoke = async function ( firestarter, protocol, revokerFN ) {
	let self = this

	if ( !self[protocol] )
		throw new Error( protocol + ' has not been started yet.', firestarter.name )

	if ( self[protocol][ firestarter.name ] ) {
		for (let element of self[protocol][ firestarter.name ]) {
			await revokerFN( firestarter, element )
			self.options.logger.radiationlog( null, protocol + ' service has been revoked.', { name: firestarter.name, address: element}, self.options.logLevel )
		}
		delete self[protocol][ firestarter.name ]
	}
	return 'ok'
}

function getFiles (srcpath, extension) {
	return fs.readdirSync(srcpath).filter(function (file) {
		return file.endsWith(extension)
	})
}
let extensions = getFiles( path.join( __dirname, 'ext' ), '.js' )
extensions.forEach( function ( extension ) {
	let newServices = require( path.join( __dirname, 'ext', extension ) )
	radiation = assigner.assign( radiation, newServices )
} )


module.exports = Radiation
