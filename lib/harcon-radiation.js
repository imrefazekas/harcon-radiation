var ES6 = require('./ES6Fixer');

var VERSION = exports.VERSION = '0.2.6';
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
		castOf: function( name, firestarter ){
			if( firestarter.object ){
				if( firestarter.object.rest )
					self.unrest( name, firestarter );
				if( firestarter.object.websocket )
					self.desocket( name, firestarter );
			}
		},
		affiliate: function( firestarter ){
			if( firestarter.object ){
				if( firestarter.object.rest )
					self.dorest( firestarter );
				if( firestarter.object.websocket )
					self.dosocket( firestarter );
			}
		},
		close: function(){
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

radiation.ignite = function( id, division, event, params, callback ){
	var parameters = [ id, division, event ].concat( params );
	parameters.push( function(err, res){
		return callback( err, res );
	} );
	this.firestarter.ignite.apply( this.firestarter, parameters );
};

radiation.publish = function( firestarter, service, attribute, publisherFN ){
	var self = this;

	if( !self[attribute] )
		return self.logger.warn( service + ' has not been started yet.', firestarter.name );

	if( self[attribute][ firestarter.name ] )
		return self.logger.warn( 'Component has been published already.', firestarter.name );

	self[attribute][ firestarter.name ] = [];
	firestarter.services().forEach( function(service){
		var address = publisherFN(firestarter, service);
		self.rests[ firestarter.name ].push( address );

		self.logger.radiationlog( null, service + ' has been published.', { name: firestarter.name, address: address}, self.logLevel );
	});
};

radiation.revoke = function( firestarter, service, attribute, revokerFN ){
	var self = this;

	if( !self[attribute] )
		return self.logger.warn( service + ' has not been started yet.', firestarter.name );

	if( self[attribute][ firestarter.name ] ){
		self[attribute][ firestarter.name ].forEach(function( element ){
			revokerFN( firestarter, element );
			self.logger.radiationlog( null, 'Service has been revoked.', { name: firestarter.name, address: element}, self.logLevel );
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
		self.restify.post( path, function( request, content, callback ){
			self.ignite( null, firestarter.division, firestarter.context + '.' + service, content.params || content.parameters || [], callback );
		} );
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

radiation.io = function( io ) {
	var self = this;
	self.io = io;
	self.ios = { };
	self.ioNamespace = io.of('/' + self.inflicter.name );
	self.ioNamespace.on('connection', function(socket){
		socket.on('ignite', function( data ){
			if( data && data.event ){
				return self.ignite( data.id, data.division, data.event, data.params || data.parameters || [], function(err, res){
					socket.emit( err ? 'error' : 'done', err ? { id: data.id, message: err.message } : { id: data.id, result: res } );
				} );
			}
			self.logger.warn( 'This message won\'t be handled.', data );
		});
	});
	this.logger.radiationlog( null, 'Websocket service has been activated.', {}, self.logLevel );
	return io;
};

module.exports = Radiation;
