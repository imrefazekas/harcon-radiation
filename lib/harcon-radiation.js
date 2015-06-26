var ES6 = require('./ES6Fixer');

var Clerobee = require('clerobee');
var clerobee = new Clerobee( 32 );

var _ = require('lodash');

var VERSION = exports.VERSION = '1.1.0';
function extend(obj, extension){
	for(var key in extension){
		if( extension[key] )
			obj[key] = extension[key];
	}
	return obj;
}

function Radiation( inflicter, options ){
	var self = this;

	this.toREST = [ ];
	this.toWebsocket = [ ];

	this.options = options || {};
	this.hideInnerServices = this.options.hideInnerServices;
	this.innerServicesPrefix = this.options.innerServicesPrefix || '_';
	this.innerServicesFn = this.options.innerServicesFn || function(){ return false; };
	this.logLevel = this.options.level || 'info';
	this.logger = this.options.logger || inflicter.logger;

	this.logger.radiationlog = function( err, message, obj, level ){
		this.log( err ? 'error' : (level || 'debug'), err ? err.message : message, extend( obj || {}, { 'radiation': VERSION } ) );
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
		context: inflicter.name,
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

var context = function( firestarter, prefix ){
	var reference = prefix.replace('.', '/');
	var division =  firestarter.division ? '/' + firestarter.division.replace('.', '/') : '';
	return division + '/' + reference;
};
var qualify = function( firestarter, prefix ){
	var division =  firestarter.division ? firestarter.division + '.' : '';
	return division + prefix + '.';
};

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

radiation.unrest = function( name, firestarter ){
	var self = this;
	this.revoke( firestarter, 'REST', function(firestarter, path){
		self.restify.unpost( path.context + path.path );
	});
};

radiation.desocket = function( name, firestarter ) {
	this.revoke( firestarter, 'Websocket', function(firestarter, websocket){
	});
};

radiation.dorest = function( firestarter ){
	var self = this;

	if( !self.REST )
		return this.toREST.push( firestarter );

	this.publish( firestarter, 'REST', function(firestarter, prefix, service){
		var path = { path: '/' + service, context: context(firestarter, prefix) };
		var security = firestarter.object.security || {};
		security.options = true;
		path.protector = security.protector ? security.protector( service ) : null;
		self.restify.post( path, function( request, content, callback ){
			var params = content.params || content.parameters || [];
			var newRequest = _.pick(request, 'headers', 'url', 'method', 'originalUrl', 'body', 'query', 'params');
			self.notifyListeners( 'posted', [ self, { request: newRequest, content: content } ] );
			self.ignite( clerobee.generate(), { request: newRequest, content: content }, firestarter.division, prefix + '.' + service, params, callback );
		}, null, security );
		return path;
	} );
};

radiation.dosocket = function( firestarter ) {
	if( !this.Websocket )
		return this.toWebsocket.push( firestarter );

	this.publish( firestarter, 'Websocket', function(firestarter, prefix, service){
		var websocket = qualify(firestarter, prefix) + service;
		return websocket;
	} );
};

radiation.rester = function( rest, options ) {
	var self = this;

	this.restify = rest;
	this.REST = { };
	this.logger.radiationlog( null, 'REST service has been activated.', {}, this.logLevel );

	this.toREST.forEach( function(firestarter){
		self.logger.radiationlog( null, 'Posteriorly executed publishing for REST...', { name: firestarter.name }, self.logLevel );
		self.dorest( firestarter );
	} );
	this.toREST.length = 0;

	return rest.rester( options || {} );
};

radiation.checkSecurity = function( data, callback ){
	var self = this;
	for(var fName in this.Websocket) {
		if( fName && this.Websocket[fName] ){
			var fs = this.Websocket[fName].firestarter;
			if( fs.matches( data.division, data.event ) && fs.object ){
				var security = fs.object.security || {};
				if( security.apiKeys && !security.apiKeys.contains( data.apiKey ) )
					return callback( null, false );
				if( security.iohalter )
					return security.iohalter( data, callback );
				else
					return callback( null, true );
			}
		}
	}
	return callback( null, false );
};

radiation.io = function( io ) {
	var self = this;
	self.io = io;
	self.Websocket = { };

	self.ioNamespace = io.of('/' + self.inflicter.name );
	self.notifyListeners( 'ioCreacted', [ self, self.ioNamespace ] );
	self.ioNamespace.on('connection', function(socket){
		self.notifyListeners( 'ioConnected', [ self, socket ] );
		socket.on('ignite', function( data ){
			if( _.isString(data) )
				data = JSON.parse( data );
			if( data && data.event ){
				self.checkSecurity(data, function(er, secure){
					if( er )
						return self.logger.error( er, data );
					if( secure )
						return self.ignite( data.id, data.terms, data.division, data.event, data.params || data.parameters || [], function(err, res){
							socket.emit( err ? 'error' : 'done', err ? { id: data.id, message: err.message } : { id: data.id, result: res } );
						} );
					else
						self.logger.warn( 'This message won\'t be handled.', data );
				});
			}
		});
	});
	this.logger.radiationlog( null, 'Websocket service has been activated.', {}, self.logLevel );


	this.toWebsocket.forEach( function(firestarter){
		self.logger.radiationlog( null, 'Posteriorly executed publishing for Websocket...', { name: firestarter.name }, self.logLevel );
		self.dosocket( firestarter );
	} );
	this.toWebsocket.length = 0;

	return io;
};

module.exports = Radiation;
