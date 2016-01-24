var ES7 = require('./ES7Fixer');

var _ = require('isa.js');
var assigner = require('assign.js');

var fs = require('fs');
var path = require('path');

var VERSION = exports.VERSION = '1.6.6';

var attributesRespected = [ 'user', 'files' ];

function Radiation( inflicter, options ){
	var self = this;

	this.toREST = [ ];
	this.toWebsocket = [ ];

	this.options = options || {};

	this.harconrest = this.options.hasOwnProperty('harconrest') || true;
	this.jsonrpcPath = this.options.jsonrpcPath;

	this.inboundShifts = this.options.inboundShifts;

	this.attributesRespected = this.options.attributesRespected || attributesRespected;
	this.hideInnerServices = this.options.hideInnerServices;
	this.innerServicesPrefix = this.options.innerServicesPrefix || '_';
	this.innerServicesFn = this.options.innerServicesFn || function(){ return false; };
	this.logLevel = this.options.level || 'info';
	this.logger = this.options.logger || inflicter.logger;

	this.logger.radiationlog = function( err, message, obj, level ){
		this.log( err ? 'error' : (level || 'debug'), err ? err.message : message, assigner.assign( obj || {}, { 'radiation': VERSION } ) );
	}.bind( self.logger );

	self.listeners = [];
	self.notifyListeners = function( fnName, params ){
		self.listeners.forEach( function( listener ){
			if( listener[ fnName ] && _.isFunction( listener[ fnName ] ) )
				listener[ fnName ].apply( listener, params );
		} );
	};

	this.inflicter = inflicter;
	this.firestarter = inflicter.addicts( {
		name: this.options.name || 'Radiation',
		options: this.options,
		auditor: true,
		context: 'Inflicter',
		division: inflicter.division,
		castOf: function( name, firestarter, callback ){
			if( firestarter.object ){
				if( firestarter.object.rest ){
					self.logger.radiationlog( null, 'UnResting', { name: firestarter.name }, self.logLevel );
					self.unrest( name, firestarter );
				}
				if( firestarter.object.websocket ){
					self.logger.radiationlog( null, 'UnSocketing', { name: firestarter.name }, self.logLevel );
					self.desocket( name, firestarter );
				}
			}
			callback();
		},
		shifted: function( component, callback ){
			self.notifyListeners( 'shifted', [self, component] );
			if( !self.inboundShifts )
				self.broadcast( component );
			callback();
		},
		affiliate: function( firestarter, callback ){
			if( firestarter.object ){
				if( firestarter.object.rest ){
					self.logger.radiationlog( null, 'Resting', { name: firestarter.name }, self.logLevel );
					self.dorest( firestarter );
				}
				if( firestarter.object.websocket ){
					self.logger.radiationlog( null, 'Socketing', { name: firestarter.name }, self.logLevel );
					self.dosocket( firestarter );
				}
			}
			callback();
		},
		close: function( ){
			if( this.options.closeRest )
				self.restify.shutdown();
		}
	} );
	this.divisions = {};
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
		return self.logger.warn( protocol + ' has not been started yet.', firestarter.name );

	if( self[protocol][ firestarter.name ] )
		return self.logger.warn( 'Component has been published already.', firestarter.name );

	self[protocol][ firestarter.name ] = [];
	self[protocol][ firestarter.name ].firestarter = firestarter;
	firestarter.services().forEach( function(service){
		if( !service || ( self.hideInnerServices && ( service.startsWith( self.innerServicesPrefix ) || self.innerServicesFn(service) ) ) ) return;

		var address;
		if( firestarter.context ){
			address = publisherFN(firestarter, firestarter.context, service);
			self[protocol][ firestarter.name ].push( address );
			self.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.logLevel );
		}
		address = publisherFN(firestarter, firestarter.name, service);
		self[protocol][ firestarter.name ].push( address );
		self.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.logLevel );

	});
};

radiation.revoke = function( firestarter, protocol, revokerFN ){
	var self = this;

	if( !self[protocol] )
		return self.logger.warn( protocol + ' has not been started yet.', firestarter.name );

	if( self[protocol][ firestarter.name ] ){
		self[protocol][ firestarter.name ].forEach(function( element ){
			revokerFN( firestarter, element );
			self.logger.radiationlog( null,  protocol + ' service has been revoked.', { name: firestarter.name, address: element}, self.logLevel );
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
