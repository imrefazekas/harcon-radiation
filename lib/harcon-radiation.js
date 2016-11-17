'use strict'

require('./ES7Fixer')

let Proback = require('proback.js')
const sequential = Proback.syncAll

let _ = require('isa.js')
let Assigner = require('assign.js')
let assigner = new Assigner()

let fs = require('fs')
let path = require('path')

let VERSION = exports.VERSION = JSON.parse( fs.readFileSync( path.join(__dirname, '..', 'package.json'), 'utf8' ) ).version

let DefaultConfig = require('./DefaultConfig')

function Radiation ( inflicter, options, callback ) {
	let self = this

	this.deployedServices = []
	this.toREST = [ ]
	this.toWebsocket = [ ]

	assigner.recursive(true)

	self.options = assigner.assign( {}, DefaultConfig.config(inflicter), options || {} )

	self.options.logger.radiationlog = function ( err, message, obj, level ) {
		this.log( err ? 'error' : (level || 'info'), err ? err.message : message, assigner.assign( obj || {}, { 'radiation': VERSION } ) )
	}.bind( self.options.logger )

	self.listeners = []
	self.notifyListeners = function ( fnName, params ) {
		self.listeners.forEach( function ( listener ) {
			if ( listener[ fnName ] && _.isFunction( listener[ fnName ] ) )
				listener[ fnName ].apply( listener, params )
		} )
	}

	this.inflicter = inflicter
}

let radiation = Radiation.prototype

radiation.entityURIs = function ( callback ) {
	let self = this
	self.inflicter.entities( function (err, entities) {
		callback( err, {
			entities: entities,
			port: self.options.port,
			rest: {
				harconRPC: self.options.rest.harconrpcPath,
				jsonRPC: self.options.rest.jsonrpcPath,
				mappings: self.options.rest.ignoreRESTPattern ? null : (self.REST || [])
			},
			websocket: {
				harconRPC: self.options.websocket.socketPath,
				jsonRPC: self.options.websocket.jsonrpcPath,
				mappings: self.Websocket || []
			},
			deployedServices: self.deployedServices || []
		} )
	} )
}
radiation.init = function (callback) {
	let self = this

	return new Promise( function (resolve, reject) {
		self.inflicter.addicts( {
			name: self.options.name || 'Radiation',
			distinguish: self.options.distinguish,
			options: self.options,
			auditor: true,
			context: 'Inflicter',
			division: self.inflicter.division,
			init: function (options) {
				if ( self.options.exposeVivid ) {
					self.dorest( self.inflicter.systemFirestarter, 'vivid' )
					self.dosocket( self.inflicter.systemFirestarter, 'vivid' )
				}
			},
			castOf: function ( name, firestarter, cb ) {
				if ( firestarter.object ) {
					if ( firestarter.object.rest ) {
						self.options.logger.radiationlog( null, 'UnResting', { name: firestarter.name }, self.options.logLevel )
						self.unrest( name, firestarter )
					}
					if ( firestarter.object.websocket ) {
						self.options.logger.radiationlog( null, 'UnSocketing', { name: firestarter.name }, self.options.logLevel )
						self.desocket( name, firestarter )
					}
				}
				cb()
			},
			shifted: function ( component, cb ) {
				self.notifyListeners( 'shifted', [self, component] )
				if ( !self.options.inboundShifts )
					self.broadcast( component )
				cb()
			},
			/*
			affiliated: function ( division, context, name, cb ) {
				cb()
			},
			radiated: function ( division, context, name, cb ) {
				cb()
			},
			*/
			affiliate: function ( firestarter, cb ) {
				if ( firestarter.object ) {
					self.deployedServices.push( {
						division: firestarter.division,
						context: firestarter.context,
						name: firestarter.name,
						services: firestarter.services()
					} )
					if ( firestarter.object.rest ) {
						self.options.logger.radiationlog( null, 'Resting', { name: firestarter.name }, self.options.logLevel )
						self.dorest( firestarter )
					}
					if ( firestarter.object.websocket ) {
						self.options.logger.radiationlog( null, 'Socketing', { name: firestarter.name }, self.options.logLevel )
						self.dosocket( firestarter )
					}
					self._igniteSystemEvent('radiated', firestarter.name, firestarter.division, firestarter.context )
				}
				cb()
			},
			close: function ( callback ) {
				if ( self.options.rest.closeRest )
					self.restify.shutdown()
				if ( callback )
					callback()
			},
			entityURIs: self.entityURIs,
			inflicter: self.inflicter
		}, {}, function ( err, res ) {
			if ( err ) return Proback.rejecter( err, callback, reject )

			self.firestarter = self.inflicter.barrel.firestarter( res.name )

			self._inited( function ( err, res ) {
				if ( err ) return Proback.rejecter(err, callback, reject)
				Proback.resolver( res, callback, resolve )
			} )
		} )
	} )
}

radiation._igniteSystemEvent = function () {
	if (this.inflicter) {
		var args = [ null, null, this.inflicter.systemFirestarter.division, this.inflicter.systemFirestarter.name + '.' + arguments[0] ]
		for (var i = 1; i < arguments.length; i += 1)
			args.push( arguments[i] )
		this.inflicter.systemFirestarter.ignite.apply( this.inflicter.systemFirestarter, args )
	}
}

radiation._inited = function (callback) {
	let self = this

	this.divisions = {}

	if ( self.options.mimesis && self.options.mimesis.enabled ) {
		let readEntity = function ( entityDef, cb ) {
			try {
				let Module = module.constructor
				let m = new Module()
				m._compile(entityDef, 'Mimesis.js')
				self.mimicEntity = self.inflicter.addicts( m.exports, {}, cb )
			}
			catch ( err ) { cb(err) }
		}

		self.inflicter.addicts( {
			name: self.options.mimesis.name || 'Mimesis',
			rest: !!self.options.mimesis.rest,
			websocket: !!self.options.mimesis.websocket,
			reshape: function ( cb ) {
				if ( self.mimicEntity )
					self.inflicter.detracts( self.mimicEntity, cb )
			},
			mimic: function ( entityDef, terms, ignite, cb ) {
				let fns = []

				if ( self.mimicEntity )
					fns.push( function (previousResponse, responses, count) {
						return new Promise( (resolve, reject) => {
							self.inflicter.detracts( self.mimicEntity, Proback.handler( null, resolve, reject ) )
							self.mimicEntity = null
						} )
					} )

				fns.push( function (previousResponse, responses, count) {
					return new Promise( (resolve, reject) => {
						readEntity( entityDef, Proback.handler( null, resolve, reject ) )
					} )
				} )

				Proback.performer( sequential(fns), (err) => {
					cb(err, 'ok')
				} )
			}
		}, {}, function (err, res) {
			if ( err ) return callback(err)

			self.mimesis = self.inflicter.barrel.firestarter( res.name )

			callback( null, 'Done.' )
		} )
	}
	else {
		callback( null, 'Done.' )
	}
}

radiation.listen = function (listener) {
	let self = this
	return new Promise( (resolve, reject) => {
		if ( !listener || !_.isObject( listener ) )
			throw new Error( 'Proper listener object must be passed.' )

		self.listeners.push( listener )

		resolve( listener )
	} )
}

radiation.ignite = function ( id, terms, division, event, params, callback ) {
	let knownDivision = (division === this.inflicter.division) || division.startsWith( this.inflicter.division + '.' )
	if ( !knownDivision || this.options.shield(division, event) )
		callback( new Error('Message has been blocked') )

	let parameters = [ id, null, division, event ].concat( params )
	parameters.push( function (err, res) {
		return callback( err, res )
	} )
	this.firestarter.addTerms( id, terms )
	return this.firestarter.ignite.apply( this.firestarter, parameters )
}

radiation.publish = function ( firestarter, protocol, publisherFN ) {
	let self = this

	if ( !self[protocol] )
		return self.options.logger.warn( protocol + ' has not been started yet.', firestarter.name )

	if ( self[protocol][ firestarter.name ] )
		return self.options.logger.warn( 'Component has been published already.', firestarter.name )

	self[protocol][ firestarter.name ] = []
	self[protocol][ firestarter.name ].firestarter = firestarter
	firestarter.services().forEach( function (service) {
		if ( !service || ( self.options.hideInnerServices && ( service.startsWith( self.options.innerServicesPrefix ) || self.options.innerServicesFn(service) ) ) ) return

		let address

		let innerPublish = function ( fName ) {
			address = publisherFN(firestarter, fName, service)
			if ( address ) {
				self[protocol][ firestarter.name ].push( address )
				self.options.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.options.logLevel )
			}
		}
		if ( firestarter.context ) {
			innerPublish( firestarter.context )
		}
		innerPublish( firestarter.name )
	})
}

radiation.revoke = function ( firestarter, protocol, revokerFN ) {
	let self = this

	if ( !self[protocol] )
		return self.options.logger.warn( protocol + ' has not been started yet.', firestarter.name )

	if ( self[protocol][ firestarter.name ] ) {
		self[protocol][ firestarter.name ].forEach(function ( element ) {
			revokerFN( firestarter, element )
			self.options.logger.radiationlog( null, protocol + ' service has been revoked.', { name: firestarter.name, address: element}, self.options.logLevel )
		})
		delete self[protocol][ firestarter.name ]
	}
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
