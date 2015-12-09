var _ = require('isa.js');

var qualify = function( firestarter, prefix ){
	var division =  firestarter.division ? firestarter.division + '.' : '';
	return division + prefix + '.';
};

module.exports = {
	checkSecurity: function( data, callback ){
		var self = this;
		for(var fName in this.Websocket) {
			if( fName && this.Websocket[fName] ){
				var fs = this.Websocket[fName].firestarter;
				if( fs.matches( data.division, data.event ) && fs.object ){
					var security = fs.object.security || {};
					if( security.apiKeys && !security.apiKeys.includes( data.apiKey ) )
						return callback( null, false );
					if( security.iohalter )
						return security.iohalter( data, callback );
					else
						return callback( null, true );
				}
			}
		}
		return callback( null, false );
	},
	processSocketData: function( socket, data ){
		var self = this;
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
	},
	io: function( io ) {
		var self = this;
		self.io = io;
		self.Websocket = { };

		self.ioNamespace = io.of('/' + self.inflicter.name );
		self.notifyListeners( 'ioCreacted', [ self, self.ioNamespace ] );
		self.ioNamespace.on('connection', function(socket){
			self.notifyListeners( 'ioConnected', [ self, socket ] );
			socket.on('ignite', function( data ){
				self.processSocketData( socket, data );
			});
		});

		if( self.jsonrpcPath ){
			self.ioJSONNamespace = io.of( self.jsonrpcPath );
			self.notifyListeners( 'ioCreacted', [ self, self.ioJSONNamespace ] );
			self.ioJSONNamespace.on('connection', function(socket){
				self.notifyListeners( 'ioConnected', [ self, socket ] );
				socket.on('ignite', function( data ){
					self.processJSONSocketData( socket, data );
				});
			});
		}

		this.logger.radiationlog( null, 'Websocket service has been activated.', {}, self.logLevel );

		this.toWebsocket.forEach( function(firestarter){
			self.logger.radiationlog( null, 'Posteriorly executed publishing for Websocket...', { name: firestarter.name }, self.logLevel );
			self.dosocket( firestarter );
		} );
		this.toWebsocket.length = 0;

		return io;
	},
	desocket: function( name, firestarter ) {
		this.revoke( firestarter, 'Websocket', function(firestarter, websocket){
		});
	},
	dosocket: function( firestarter ) {
		if( !this.Websocket )
			return this.toWebsocket.push( firestarter );

		this.publish( firestarter, 'Websocket', function(firestarter, prefix, service){
			var websocket = qualify(firestarter, prefix) + service;
			return websocket;
		} );
	}
};
