'use strict'

let _ = require('isa.js')

let Communication = require( 'harcon' ).Communication

let qualify = function ( firestarter, prefix ) {
	let division = firestarter.division ? firestarter.division + '.' : ''
	return division + prefix + '.'
}

module.exports = {
	checkSecurity: function ( data, callback ) {
		let self = this
		if ( self.options.passthrough ) return callback( null, true )

		let comm = Communication.newCommunication(null, null, data.id, self.firestarter.name, data.division, data.event, data.params )
		for (let fName in self.Websocket) {
			if ( fName && self.Websocket[fName] ) {
				let fs = self.Websocket[fName].firestarter
				if ( fs.matches( comm ) && fs.object ) {
					let security = fs.object.security || {}
					if ( security.apiKeys && !security.apiKeys.includes( data.apiKey ) )
						return callback( null, false )
					if ( security.iohalter )
						return security.iohalter( data, callback )
					else
						return callback( null, true )
				}
			}
		}
		return callback( null, false )
	},
	processSocketData: function ( socket, data ) {
		let self = this
		if ( _.isString(data) )
			data = JSON.parse( data )
		if ( data && data.event ) {
			self.checkSecurity(data, function (er, secure) {
				if ( er )
					return self.options.logger.error( er, data )
				if ( secure )
					return self.ignite( data.id, data.terms, data.division, data.event, data.params || data.parameters || [], function (err, res) {
						socket.emit( err ? 'error' : 'done', err ? { id: data.id, message: err.message } : { id: data.id, result: res } )
					} )
				else
					self.options.logger.warn( 'This message won\'t be handled.', data )
			})
		}
	},
	broadcast: function ( shiftReport ) {
		if ( this.ioNamespace )
			if ( _.isObject( shiftReport.state ) )
				for ( let key of Object.keys( shiftReport.state ) )
					this.ioNamespace.emit( key, shiftReport.state[key] )
	},
	io: function ( io ) {
		let self = this
		self.io = io
		self.Websocket = { }

		self.ioNamespace = io.of( self.options.websocket.socketPath )
		self.notifyListeners( 'ioCreacted', [ self, self.ioNamespace ] )
		self.ioNamespace.on('connection', function (socket) {
			self.notifyListeners( 'ioConnected', [ self, socket ] )
			socket.on('ignite', function ( data ) {
				self.processSocketData( socket, data )
			})
		})

		if ( self.options.websocket.jsonrpcPath ) {
			self.options.logger.radiationlog( null, 'JSONRPC on Websocket has been activated.', { path: self.options.websocket.jsonrpcPath }, self.options.logLevel )
			self.ioJSONNamespace = io.of( self.options.websocket.jsonrpcPath )
			self.notifyListeners( 'ioCreacted', [ self, self.ioJSONNamespace ] )
			self.ioJSONNamespace.on('connection', function (socket) {
				self.notifyListeners( 'ioConnected', [ self, socket ] )
				socket.on('ignite', function ( data ) {
					self.processJSONSocketData( socket, data )
				})
			})
		}

		self.options.logger.radiationlog( null, 'Websocket service has been activated.', {}, self.options.logLevel )

		if ( self.options.mimesis ) {

		}
		self.toWebsocket.forEach( function ( reference ) {
			self.options.logger.radiationlog( null, 'Posteriorly executed publishing for Websocket...', { name: reference.firestarter.name }, self.options.logLevel )
			self.dosocket( reference.firestarter, reference.serviceInInterest )
		} )
		self.toWebsocket.length = 0

		return io
	},
	desocket: function ( name, firestarter ) {
		this.revoke( firestarter, 'Websocket', function (firestarter, websocket) {
		})
	},
	dosocket: function ( firestarter, serviceInInterest ) {
		if ( !this.Websocket )
			return this.toWebsocket.push( { firestarter: firestarter, serviceInInterest: serviceInInterest } )

		this.publish( firestarter, 'Websocket', function (firestarter, prefix, service) {
			if ( serviceInInterest && serviceInInterest !== service ) return null

			let websocket = qualify(firestarter, prefix) + service
			return websocket
		} )
	}
}
