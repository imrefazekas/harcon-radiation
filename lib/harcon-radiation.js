var rest = require('connect-rest');
var ES6 = require('./ES6Fixer');

function Radiation( inflicter, options ){
	var opts = options || {};
	this.logger = opts.logger || inflicter.logger;
	this.inflicter = inflicter;
	var self = this;
	this.firestarter = inflicter.addicts( {
		name: opts.name || 'Radiation',
		options: opts,
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
}


var radiation = Radiation.prototype;

radiation.ignite = function( division, event, params, callback ){
	var parameters = [ division, event ].concat( params );
	parameters.push( function(err, res){
		return callback( err, res );
	} );
	this.firestarter.ignite.apply( this.firestarter, parameters );
};

radiation.unrest = function( name, firestarter ){
	var self = this;

	if( !self.restOptions )
		return self.logger.warn( 'REST has not been started yet.', firestarter.name );

	if( self.rests[ firestarter.name ] ){
		self.rests[ firestarter.name ].forEach(function(path){
			rest.unpost( path.context + path.path );
			self.logger.debug( 'Service has been revoked.', firestarter.name, path );
		});
	}
};

radiation.rest = function( firestarter ){
	var self = this;
	self.rests = { };
	if( !self.restOptions )
		return self.logger.warn( 'REST has not been started yet.', firestarter.name );

	if( self.rests[ firestarter.name ] )
		return self.logger.warn( 'Component has been published already.', firestarter.name );

	self.rests[ firestarter.name ] = [];
	firestarter.services().forEach( function(service){
		var path = { path: '/' + service, context: '/' + firestarter.context };
		rest.post( path, function( request, content, callback ){
			self.ignite( firestarter.division, firestarter.context + '.' + service, content.params || content.parameters || [], callback );
		} );
		self.rests[ firestarter.name ].push( path );

		self.logger.debug( 'REST has been published.', firestarter.name, path );
	} );
};

radiation.desocket = function( name, firestarter ) {
	var self = this;

	if( !self.ios )
		return self.logger.warn( 'Websocket has not been started yet.', firestarter.name );

	firestarter.services().forEach( function(service){
		var websocket = firestarter.context + '.' + service;
		var index = self.ios.indexOf( websocket );
		if( index > -1 ){
			self.ios.splice( index, 1 );
			self.logger.debug( 'Websocket has been revoked.', websocket );
		}
	} );
};

radiation.socket = function( firestarter ) {
	var self = this;

	if( !self.ios )
		return self.logger.warn( 'Websocket has not been started yet.', firestarter.name );

	firestarter.services().forEach( function(service){
		var websocket = firestarter.context + '.' + service;
		if( self.ios.contains( websocket ) )
			return self.logger.warn( 'Component has been published already.', websocket );
		self.ios.push( websocket );

		self.logger.debug( 'Websocket has been published.', firestarter.name, websocket );
	} );
};

radiation.rester = function( options ) {
	this.restOptions = options || {};
	this.logger.debug( 'REST Service has been activated.', this.restOptions );
	return rest.rester( options );
};

radiation.io = function( io ) {
	var self = this;
	self.io = io;
	self.ios = [];
	self.ioNamespace = io.of('/' + self.inflicter.name );
	self.ioNamespace.on('connection', function(socket){
		socket.on('ignite', function( data ){
			if( data && data.event ){
				if( self.ios.contains( data.event ) ){
					return self.ignite( data.division, data.event, data.params || data.parameters || [], function(err, res){
						socket.emit( err ? 'error' : 'done', err ? err.message : res );
					} );
				}
			}
			self.logger.warn( 'This message won\'t be handled.', data );
		});
		self.logger.debug( 'Socket client connected', socket );
	});
	return io;
};

module.exports = Radiation;
