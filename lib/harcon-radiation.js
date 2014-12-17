var rest = require('connect-rest');
var ES6 = require('./ES6Fixer');

var VERSION = exports.VERSION = '0.2.5';
function extend(obj, extension){
	for(var key in extension){
		if( extension[key] )
			obj[key] = extension[key];
	}
	return obj;
}

function Radiation( inflicter, options ){
	var self = this;

	var opts = options || {};
	this.logLevel = opts.level || 'info';
	this.logger = opts.logger || inflicter.logger;
	this.logger.radiationlog = function( err, message, obj, level ){
		this.log( err ? 'error' : (level || 'debug'), err ? err.message : message, extend( obj || {}, { 'radiation': VERSION } ) );
	}.bind( self.logger );

	this.inflicter = inflicter;
	this.firestarter = inflicter.addicts( {
		name: opts.name || 'Radiation',
		options: opts,
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
					self.rest( firestarter );
				if( firestarter.object.websocket )
					self.socket( firestarter );
			}
		},
		close: function(){
			rest.shutdown();
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
	this.revoke( firestarter, 'REST', 'rests', function(firestarter, path){
		rest.unpost( path.context + path.path );
	});
};


radiation.desocket = function( name, firestarter ) {
	this.revoke( firestarter, 'Websocket', 'ios', function(firestarter, websocket){
	});
};


radiation.rest = function( firestarter ){
	var self = this;
	this.publish( firestarter, 'REST', 'rests', function(firestarter, service){
		var path = { path: '/' + service, context: context(firestarter) };
		rest.post( path, function( request, content, callback ){
			self.ignite( null, firestarter.division, firestarter.context + '.' + service, content.params || content.parameters || [], callback );
		} );
		return path;
	} );
};

radiation.socket = function( firestarter ) {
	this.publish( firestarter, 'Websocket', 'ios', function(firestarter, service){
		var websocket = qualify(firestarter) + service;
		return websocket;
	} );
};

radiation.rester = function( options ) {
	this.restOptions = options || {};
	this.rests = { };
	this.logger.radiationlog( null, 'REST service has been activated.', {}, this.logLevel );
	return rest.rester( this.restOptions );
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
