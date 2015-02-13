var ES6 = require('./ES6Fixer');

var Clerobee = require('clerobee');
var clerobee = new Clerobee( 32 );

var VERSION = exports.VERSION = '0.4.1';
function extend(obj, extension){
	for(var key in extension){
		if( extension[key] )
			obj[key] = extension[key];
	}
	return obj;
}

function Radiation( inflicter, options ){
	var self = this;

	this.options = options || {};
	this.logLevel = this.options.level || 'info';
	this.logger = this.options.logger || inflicter.logger;
	this.logger.radiationlog = function( err, message, obj, level ){
		this.log( err ? 'error' : (level || 'debug'), err ? err.message : message, extend( obj || {}, { 'radiation': VERSION } ) );
	}.bind( self.logger );

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

var context = function( firestarter ){
	return (firestarter.division?'/'+firestarter.division:'') + '/'+firestarter.context;
};
var qualify = function( firestarter ){
	return (firestarter.division?firestarter.division+'.':'') + firestarter.context+'.';
};

var radiation = Radiation.prototype;

radiation.ignite = function( id, terms, division, event, params, callback ){
	var parameters = [ id, division, event ].concat( params );
	parameters.push( function(err, res){
		return callback( err, res );
	} );
	this.firestarter.addTerms( id, terms );
	this.firestarter.ignite.apply( this.firestarter, parameters );
};

radiation.publish = function( firestarter, protocol, attribute, publisherFN ){
	var self = this;

	if( !self[attribute] )
		return self.logger.warn( protocol + ' has not been started yet.', firestarter.name );

	if( self[attribute][ firestarter.name ] )
		return self.logger.warn( 'Component has been published already.', firestarter.name );

	self[attribute][ firestarter.name ] = [];
	self[attribute][ firestarter.name ].firestarter = firestarter;
	firestarter.services().forEach( function(service){
		var address = publisherFN(firestarter, service);
		self[attribute][ firestarter.name ].push( address );

		self.logger.radiationlog( null, service + ' has been published on ' + protocol, { name: firestarter.name, address: address}, self.logLevel );
	});
};

radiation.revoke = function( firestarter, protocol, attribute, revokerFN ){
	var self = this;

	if( !self[attribute] )
		return self.logger.warn( protocol + ' has not been started yet.', firestarter.name );

	if( self[attribute][ firestarter.name ] ){
		self[attribute][ firestarter.name ].forEach(function( element ){
			revokerFN( firestarter, element );
			self.logger.radiationlog( null,  protocol + ' service has been revoked.', { name: firestarter.name, address: element}, self.logLevel );
		});
		delete self[attribute][ firestarter.name ];
	}
};

radiation.unrest = function( name, firestarter ){
	var self = this;
	this.revoke( firestarter, 'REST', 'rests', function(firestarter, path){
		self.restify.unpost( path.context + path.path );
	});
};

radiation.desocket = function( name, firestarter ) {
	this.revoke( firestarter, 'Websocket', 'ios', function(firestarter, websocket){
	});
};

radiation.dorest = function( firestarter ){
	var self = this;
	this.publish( firestarter, 'REST', 'rests', function(firestarter, service){
		var path = { path: '/' + service, context: context(firestarter) };
		var security = firestarter.object.security || {};
		path.protector = security.protector;
		self.restify.post( path, function( request, content, callback ){
			self.ignite( clerobee.generate(), { request: request, content: content }, firestarter.division, firestarter.context + '.' + service, content.params || content.parameters || [], callback );
		}, null, security );
		return path;
	} );
};

radiation.dosocket = function( firestarter ) {
	this.publish( firestarter, 'Websocket', 'ios', function(firestarter, service){
		var websocket = qualify(firestarter) + service;
		return websocket;
	} );
};

radiation.rester = function( rest, options ) {
	this.restify = rest;
	this.rests = { };
	this.logger.radiationlog( null, 'REST service has been activated.', {}, this.logLevel );
	return rest.rester( options || {} );
};

radiation.checkSecurity = function( data, callback ){
	var self = this;
	for(var fName in this.ios) {
		if( fName && this.ios[fName] ){
			var fs = this.ios[fName].firestarter;
			if( fs.matches( data.division, data.event ) && fs.object ){
				var security = fs.object.security || {};
				if( security.apiKeys && !security.apiKeys.contains( data.apiKey ) )
					return callback( null, false );
				if( security.iohalter )
					return security.iohalter( data, callback );
				else
					return callback( null, true );
			}
			//self.options.ioProtector
		}
	}
	return callback( null, false );
};

radiation.io = function( io ) {
	var self = this;
	self.io = io;
	self.ios = { };
	self.ioNamespace = io.of('/' + self.inflicter.name );
	self.ioNamespace.on('connection', function(socket){
		socket.on('ignite', function( data ){
			if( data && data.event ){
				self.checkSecurity(data, function(er, secure){
					if( er )
						return self.logger.error( er, data );
					if( secure )
						return self.ignite( data.id, null, data.division, data.event, data.params || data.parameters || [], function(err, res){
							socket.emit( err ? 'error' : 'done', err ? { id: data.id, message: err.message } : { id: data.id, result: res } );
						} );
					else
						self.logger.warn( 'This message won\'t be handled.', data );
				});
			}
		});
	});
	this.logger.radiationlog( null, 'Websocket service has been activated.', {}, self.logLevel );
	return io;
};

module.exports = Radiation;
