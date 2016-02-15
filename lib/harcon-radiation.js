var ES7 = require('./ES7Fixer');

var async = require('async');

var _ = require('isa.js');
var assigner = require('assign.js');

var fs = require('fs');
var path = require('path');

var VERSION = exports.VERSION = '2.5.1';

var DefaultConfig = require('./DefaultConfig');

function Radiation( inflicter, options ){
	var self = this;

	this.toREST = [ ];
	this.toWebsocket = [ ];

	this.options = assigner.assign( DefaultConfig.config(inflicter), options || {} );

	this.options.logger.radiationlog = function( err, message, obj, level ){
		this.log( err ? 'error' : (level || 'info'), err ? err.message : message, assigner.assign( obj || {}, { 'radiation': VERSION } ) );
	}.bind( self.options.logger );

	self.listeners = [];
	self.notifyListeners = function( fnName, params ){
		self.listeners.forEach( function( listener ){
			if( listener[ fnName ] && _.isFunction( listener[ fnName ] ) )
				listener[ fnName ].apply( listener, params );
		} );
	};

	this.inflicter = inflicter;
	this.firestarter = inflicter.addicts( {
		name: self.options.name || 'Radiation',
		options: self.options,
		auditor: true,
		context: 'Inflicter',
		division: inflicter.division,
		init: function (options) {
			if( self.options.exposeVivid ){
				self.dorest( inflicter.systemFirestarter, 'vivid' );
				self.dosocket( inflicter.systemFirestarter, 'vivid' );
			}
		},
		castOf: function( name, firestarter, callback ){
			if( firestarter.object ){
				if( firestarter.object.rest ){
					self.options.logger.radiationlog( null, 'UnResting', { name: firestarter.name }, self.options.logLevel );
					self.unrest( name, firestarter );
				}
				if( firestarter.object.websocket ){
					self.options.logger.radiationlog( null, 'UnSocketing', { name: firestarter.name }, self.options.logLevel );
					self.desocket( name, firestarter );
				}
			}
			callback();
		},
		shifted: function( component, callback ){
			self.notifyListeners( 'shifted', [self, component] );
			if( !self.options.inboundShifts )
				self.broadcast( component );
			callback();
		},
		affiliate: function( firestarter, callback ){
			if( firestarter.object ){
				if( firestarter.object.rest ){
					self.options.logger.radiationlog( null, 'Resting', { name: firestarter.name }, self.options.logLevel );
					self.dorest( firestarter );
				}
				if( firestarter.object.websocket ){
					self.options.logger.radiationlog( null, 'Socketing', { name: firestarter.name }, self.options.logLevel );
					self.dosocket( firestarter );
				}
			}
			callback();
		},
		close: function( ){
			if( self.options.rest.closeRest )
				self.restify.shutdown();
		},
		entityURIs: function( callback ){
			callback( null, {
				rest: self.REST || { },
				websocket: self.Websocket || { }
			} );
		}
	} );
	this.divisions = {};


	if( self.options.mimesis && self.options.mimesis.enabled ){
		var readEntity = function( entityDef, callback ){
			try{
				var Module = module.constructor;
				var m = new Module();
				m._compile(entityDef, 'Nimesis.js');
				self.mimicEntity = inflicter.addicts( m.exports, {}, callback );
			}
			catch( err ){ callback(err); }
		};

		self.mimesis = inflicter.addicts( {
			name: self.options.mimesis.name || 'Nimesis',
			rest: !!self.options.mimesis.rest,
			websocket: !!self.options.mimesis.websocket,
			reshape: function( callback ){
				if( self.mimicEntity )
					self.inflicter.detracts( self.mimicEntity, callback );
			},
			mimic: function( entityDef, terms, ignite, callback ){
				var fns = [];

				if( self.mimicEntity )
					fns.push( function(cb){
						self.inflicter.detracts( self.mimicEntity, cb );
						self.mimicEntity = null;
					} );

				fns.push( function(cb){
					readEntity( entityDef, cb );
				} );

				async.series( fns, function( err, res ){
					callback(err, 'Done.');
				} );
			}
		} );
	}
}

var radiation = Radiation.prototype;

radiation.listen = function(listener){
	if( !listener || !_.isObject( listener ) )
		throw new Error( 'Proper listener object must be passed.' );

	var self = this;
	self.listeners.push( listener );
};

radiation.ignite = function( id, terms, division, event, params, callback ){
	var parameters = [ id, division, event ].concat( params );
	parameters.push( function(err, res){
		return callback( err, res );
	} );
	this.firestarter.addTerms( id, terms );
	this.firestarter.ignite.apply( this.firestarter, parameters );
};

radiation.publish = function( firestarter, protocol, publisherFN ){
	var self = this;

	if( !self[protocol] )
		return self.options.logger.warn( protocol + ' has not been started yet.', firestarter.name );

	if( self[protocol][ firestarter.name ] )
		return self.options.logger.warn( 'Component has been published already.', firestarter.name );

	self[protocol][ firestarter.name ] = [];
	self[protocol][ firestarter.name ].firestarter = firestarter;
	firestarter.services().forEach( function(service){
		if( !service || ( self.options.hideInnerServices && ( service.startsWith( self.options.innerServicesPrefix ) || self.options.innerServicesFn(service) ) ) ) return;

		var address;

		var innerPublish = function( fName ){
			address = publisherFN(firestarter, fName, service);
			if( address ){
				self[protocol][ firestarter.name ].push( address );
				self.options.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.options.logLevel );
			}
		};
		if( firestarter.context ){
			innerPublish( firestarter.context );
		}
		innerPublish( firestarter.name );
	});
};

radiation.revoke = function( firestarter, protocol, revokerFN ){
	var self = this;

	if( !self[protocol] )
		return self.options.logger.warn( protocol + ' has not been started yet.', firestarter.name );

	if( self[protocol][ firestarter.name ] ){
		self[protocol][ firestarter.name ].forEach(function( element ){
			revokerFN( firestarter, element );
			self.options.logger.radiationlog( null,  protocol + ' service has been revoked.', { name: firestarter.name, address: element}, self.options.logLevel );
		});
		delete self[protocol][ firestarter.name ];
	}
};

function getFiles(srcpath, extension) {
	return fs.readdirSync(srcpath).filter(function(file) {
		return file.endsWith(extension);
	});
}
var extensions = getFiles( path.join( __dirname, 'ext' ), '.js' );
extensions.forEach( function( extension ){
	var newServices = require( path.join( __dirname, 'ext', extension ) );
	radiation = assigner.assign( radiation, newServices );
} );


module.exports = Radiation;
