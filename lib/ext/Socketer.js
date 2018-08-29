let Proback = require('proback.js')
let _ = require('isa.js')

let Communication = require( 'harcon' ).Communication

let qualify = function ( firestarter, prefix ) {
	let division = firestarter.division ? firestarter.division + '.' : ''
	return division + prefix + '.'
}

module.exports = {
	emitError: function ( socket, data, err ) {
		socket.emit( 'failure', { id: data.id, message: err.message } )
		throw err
	},
	checkSecurity: async function ( data ) {
		let self = this

		return new Promise( async (resolve, reject) => {
			if ( self.options.passthrough ) return resolve( true )
			let comm = Communication.newCommunication(null, null, data.id, self.firestarter.division, self.firestarter.name, self.firestarter.barrel.nodeID, data.division, data.event, data.params )
			for (let fName in self.Websocket) {
				if ( fName && self.Websocket[fName] ) {
					let fs = self.Websocket[fName].firestarter
					if ( fs.matches( comm ) && fs.object ) {
						let security = fs.object.security || {}
						if ( security.apiKeys && !security.apiKeys.includes( data.apiKey ) )
							return resolve( false )
						if ( security.iohalter )
							return resolve( await security.iohalter( data ) )
						else
							return resolve( true )
					}
				}
			}
			return resolve( false )
		} )
	},
	processSocketData: async function ( socket, data ) {
		let self = this
		try {
			if ( _.isString(data) )
				data = JSON.parse( data )
			if ( data.error )
				throw data.error
			else if ( data && data.event ) {
				let secure = await self.checkSecurity(data )
				if ( secure ) {
					let res = await self.ignite( data.id, data.terms, data.division, data.event, data.params || data.parameters || [] )
					await self.options.assignSocket( data.event )( data.terms, res, socket )
					socket.emit( 'success', { id: data.id, result: res } )
				} else
					throw new Error('This message failed on security check.')
			}
		} catch (err) { self.emitError( socket, data, err ) }
	},
	broadcastToSockets: async function ( sockets, state ) {
		for (let socket of sockets)
			for ( let key of Object.keys( state ) )
				socket.emit( key, state[key] )
		return 'ok'
	},
	broadcast: async function ( shiftReport ) {
		var self = this
		if (!_.isObject( shiftReport.state) )
			throw new Error('Object\'s state is not an object...' + shiftReport.state )

		if ( self.ioNamespace )
			await self.broadcastToSockets( self.options.targetClientSockets( self.ioNamespace, shiftReport.target ), shiftReport.state )

		if ( self.ioJSONNamespace )
			await self.broadcastToJSONSockets( self.options.targetClientSockets( self.ioJSONNamespace, shiftReport.target ), shiftReport.state )

		return 'ok'
		/*
		if ( this.ioNamespace )
			if ( _.isObject( shiftReport.state ) )
				for ( let key of Object.keys( shiftReport.state ) )
					this.ioNamespace.emit( key, shiftReport.state[key] )
		*/
	},
	harconio: async function ( io, serverServices ) {
		let self = this
		return new Promise( async (resolve, reject) => {
			try {
				self.options.logger.radiationlog( null, 'HarconRPC on Websocket has been activated.', { path: self.options.websocket.harconPath }, self.options.logLevel )
				self.ioNamespace = io.of( self.options.websocket.harconPath )
				await self.notifyListeners( 'ioCreacted', [ self, self.options.websocket.harconPath ] )
				self.ioNamespace.on('connection', async function (socket) {
					await self.notifyListeners( 'ioConnected', [ self, self.options.websocket.harconPath ] )
					socket.on('ignite', async function ( data ) {
						if (data.terms && data.terms.token && serverServices.verifyJwtToken)
							try {
								let decoded = await serverServices.verifyJwtToken( data.terms.token )
								delete data.terms.token
								if (!data.terms.request)
									data.terms.request = {}
								data.terms.request.user = decoded
							} catch (err) { data.error = err }
						try {
							await self.processSocketData( socket, data )
						} catch (err) { self.options.logger.radiationlog(err) }
					})
				})
				resolve('ok')
			} catch (err) { reject(err) }
		} )
	},
	jsonio: async function ( io, serverServices ) {
		let self = this
		return new Promise( async (resolve, reject) => {
			try {
				self.options.logger.radiationlog( null, 'JSONRPC on Websocket has been activated.', { path: self.options.websocket.jsonrpcPath }, self.options.logLevel )
				self.ioJSONNamespace = io.of( self.options.websocket.jsonrpcPath )
				await self.notifyListeners( 'ioCreacted', [ self, self.options.websocket.jsonrpcPath ] )
				self.ioJSONNamespace.on('connection', async function (socket) {
					await self.notifyListeners( 'ioConnected', [ self, self.options.websocket.jsonrpcPath ] )
					socket.on('ignite', async function ( data ) {
						if (data.terms && data.terms.token && serverServices.verifyJwtToken)
							try {
								let decoded = await serverServices.verifyJwtToken( data.terms.token )
								delete data.terms.token
								data.terms.user = decoded
							} catch (err) { data.error = err }
						try {
							await self.processJSONSocketData( socket, data )
						} catch (err) { self.options.logger.radiationlog(err) }
					})
				})
				resolve('ok')
			} catch (err) { reject(err) }
		} )
	},
	io: async function ( io, serverServices = {} ) {
		let self = this
		return new Promise( async (resolve, reject) => {
			try {
				self.io = io
				self.Websocket = { }

				if ( self.options.websocket.harconPath )
					await self.harconio( io, serverServices )

				if ( self.options.websocket.jsonrpcPath )
					await self.jsonio( io, serverServices )

				self.options.logger.radiationlog( null, 'Websocket service has been activated.', {}, self.options.logLevel )

				if ( self.options.mimesis ) { }

				for (let reference of self.toWebsocket ) {
					self.options.logger.radiationlog( null, 'Posteriorly executed publishing for Websocket...', { name: reference.firestarter.name }, self.options.logLevel )
					await self.dosocket( reference.firestarter, reference.serviceInInterest )
				}
				self.toWebsocket.length = 0

				resolve( io )
			} catch (err) { reject(err) }
		} )
	},
	desocket: async function ( name, firestarter ) {
		var self = this
		return new Promise( async (resolve, reject) => {
			await self.revoke( firestarter, 'Websocket', async function (firestarter, websocket) {
				return 'ok'
			})
			resolve('ok')
		})
	},
	dosocket: async function ( firestarter, serviceInInterest ) {
		var self = this
		return new Promise( async (resolve, reject) => {
			try {
				if ( !self.Websocket )
					self.toWebsocket.push( { firestarter: firestarter, serviceInInterest: serviceInInterest } )
				else
					await self.publish( firestarter, 'Websocket', function (firestarter, prefix, service) {
						return new Promise( (resolve, reject) => {
							if ( serviceInInterest && serviceInInterest !== service ) return resolve()

							let websocket = qualify(firestarter, prefix) + service
							resolve( websocket )
						} )
					} )
				resolve('ok')
			} catch (err) { reject( err ) }
		})
	}
}
