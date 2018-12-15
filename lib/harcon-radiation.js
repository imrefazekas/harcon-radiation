let _ = require('isa.js')
let Assigner = require('assign.js')
let assigner = new Assigner()

let fs = require('fs')
let path = require('path')

let VERSION = exports.VERSION = JSON.parse( fs.readFileSync( path.join(__dirname, '..', 'package.json'), 'utf8' ) ).version

let Communication = require('harcon/lib/Communication')

let DefaultConfig = require('./DefaultConfig')

let Creator = require('./Creator')

// checked
function Radiation ( inflicter, options ) {
	let self = this

	this.deployedServices = []
	this.toREST = [ ]
	this.toWebsocket = [ ]

	assigner.recursive(true)

	self.options = assigner.assign( {}, DefaultConfig.config(inflicter), options || {
		logger: inflicter.logger
	} )

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
radiation.entityURIs = async function ( ) {
	let self = this
	let entities = await self.inflicter.entities( )

	return {
		entities: entities,
		port: self.options.port,
		rest: {
			harconRPC: self.options.rest.harconrpcPath,
			jsonRPC: self.options.rest.jsonrpcPath,
			mappings: self.options.rest.ignoreRESTPattern ? [] : (self.REST || [])
		},
		websocket: {
			harconRPC: self.options.websocket.harconPath,
			jsonRPC: self.options.websocket.jsonrpcPath,
			mappings: self.Websocket || []
		},
		deployedServices: self.deployedServices || []
	}
}

// checked
radiation.init = async function ( ) {
	let self = this

	let entity = await self.inflicter.deploy( Creator.newRadiation( self ), {} )

	self.firestarter = self.inflicter.barrel.firestarter( entity.name )

	self.divisions = {}
	if ( self.options.mimesis && self.options.mimesis.enabled )
		await self.inflicter.deploy( Creator.newMimic(self), {} )

	return entity
}

radiation._igniteSystemEvent = async function () {
	let self = this
	if (self.inflicter) {
		var args = [ null, null, self.inflicter.systemFirestarter.division, self.inflicter.systemFirestarter.name + '.' + arguments[0] ]
		for (var i = 1; i < arguments.length; i += 1)
			args.push( arguments[i] )
		await self.inflicter.systemFirestarter.ignite( Communication.MODE_REQUEST, ...args )
	}
	return 'ok'
}

radiation._readEntity = async function ( entityDef ) {
	let self = this

	let Module = module.constructor
	let m = new Module()
	m._compile(entityDef, 'Mimesis.js')
	let mimicEntity = await self.inflicter.deploy( m.exports, {} )
	return mimicEntity
}

radiation.listen = async function (listener) {
	let self = this
	if ( !listener || !_.isObject( listener ) )
		throw new Error( 'Proper listener object must be passed.' )

	self.listeners.push( listener )

	return listener
}

radiation.request = async function ( id, terms, division, event, params ) {
	let self = this

	let knownDivision = (division === self.inflicter.division) || division.startsWith( self.inflicter.division + '.' )
	if ( !knownDivision || self.options.shield(division, event) )
		throw new Error('Message has been blocked')

	let parameters = [ id, null, division, event ].concat( params )
	self.firestarter.addTerms( id, terms )
	return self.firestarter.ignite( Communication.MODE_REQUEST, ...parameters )
}

radiation.innerRevoke = async function ( firestarter, protocol, revokeFN, service, fName ) {
	let self = this
	let address = await revokeFN(firestarter, fName, service)
	if ( address )
		self.options.logger.radiationlog( null, service + ' has been remoked on ' + protocol, { name: firestarter.name, address: address}, self.options.logLevel )
	return 'ok'
}

radiation.innerPublish = async function ( firestarter, protocol, publisherFN, service, fName ) {
	let self = this
	let address = await publisherFN(firestarter, fName, service)
	if ( address )
		self.options.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.options.logLevel )
	return 'ok'
}

radiation.publish = async function ( firestarter, protocol, publisherFN ) {
	let self = this

	if ( !self[ protocol ] )
		throw new Error( protocol + ' has not been started yet.', firestarter.name )

	for ( let service of firestarter.services() ) {
		if ( !service || ( self.options.hideInnerServices && ( service.startsWith( self.options.innerServicesPrefix ) || self.options.innerServicesFn(service) ) ) )
			continue

		if ( firestarter.context ) {
			await self.innerPublish( firestarter, protocol, publisherFN, service, firestarter.context )
		}
		await self.innerPublish( firestarter, protocol, publisherFN, service, firestarter.name )
	}
	return 'ok'
}

radiation.revoke = async function ( firestarter, protocol, revokerFN ) {
	let self = this

	if ( !self[ protocol ] )
		throw new Error( protocol + ' has not been started yet.', firestarter.name )

	for ( let service of firestarter.services() ) {
		if ( !service || ( self.options.hideInnerServices && ( service.startsWith( self.options.innerServicesPrefix ) || self.options.innerServicesFn(service) ) ) )
			continue

		if ( firestarter.context ) {
			await self.innerRevoke( firestarter, protocol, revokerFN, service, firestarter.context )
		}
		await self.innerRevoke( firestarter, protocol, revokerFN, service, firestarter.name )
	}

	return 'ok'
}

function getFiles (srcpath, extension) {
	return fs.readdirSync(srcpath).filter(function (file) {
		return file.endsWith(extension)
	})
}
let extensions = getFiles( path.join( __dirname, 'ext' ), '.js' )
for ( let extension of extensions ) {
	let newServices = require( path.join( __dirname, 'ext', extension ) )
	radiation = assigner.assign( radiation, newServices )
}

module.exports = Radiation
