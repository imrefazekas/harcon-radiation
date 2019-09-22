let Proback = require('proback.js')
let _ = require('isa.js')

module.exports = {
	emitError: function ( socket, data, err ) {
		socket.send( JSON.stringify( { id: data.id, error: err.message } ) )
		throw err
	},
	processSocketData: async function ( socket, data ) {
		let self = this
		try {
			if ( data.error )
				throw data.error
			else if ( data && data.event ) {
				let path = data.division + '.' + data.event
				if ( !self.Websocket.includes(path) )
					throw new Error(`Unknown path to call: ${path}` )

				let res = await self.request( data.id, data.terms, data.division, data.event, data.params || data.parameters || [] )
				await self.options.assignSocket( data.event, data.terms, res, socket )
				socket.send( JSON.stringify( { id: data.id, result: res } ) )
			}
		} catch (err) { self.emitError( socket, data, err ) }
	},
	broadcast: async function ( shiftReport ) {
		var self = this
		if (!_.isObject( shiftReport.state) )
			throw new Error('Object\'s state is not an object...' + shiftReport.state )

		for ( let key of Object.keys( shiftReport.state ) )
			await self.fastify.ws.broadcast( JSON.stringify( {
				division: shiftReport.division,
				name: shiftReport.name,
				state: key,
				payload: shiftReport.state[key]
			} ), self.options.identifySockets, shiftReport.target )

		return 'ok'
	},
	ws: async function ( fastify ) {
		let self = this

		self.fastify = fastify
		self.Websocket = [ ]

		let paths = []
		if (self.options.websocket.harconPath)
			paths[ self.options.websocket.harconPath ] = async function ( socket, data ) {
				try {
					if ( _.isString(data) )
						data = JSON.parse( data )
				} catch (err) { throw err }
				return self.processSocketData( socket, data )
			}
		if (self.options.websocket.jsonrpcPath)
			paths[ self.options.websocket.jsonrpcPath ] = async function ( socket, data ) {
				try {
					if ( _.isString(data) )
						data = JSON.parse( data )
				} catch (err) { throw err }
				return self.processJSONSocketData( socket, data )
			}
		fastify.register( require('../../util/WsPlugin').addWSServer( paths ), { library: 'ws' } )

		self.options.logger.radiationlog( null, 'Websocket service has been activated on paths: ' + Object.keys( paths ), {}, self.options.logLevel )

		for (let reference of self.toWebsocket ) {
			self.options.logger.radiationlog( null, 'Posteriorly executed publishing for Websocket...', { name: reference.firestarter.name }, self.options.logLevel )
			await self.dosocket( reference.firestarter, reference.serviceInInterest )
		}
		self.toWebsocket.length = 0

		return 'ok'
	},
	desocket: async function ( name, firestarter ) {
		var self = this
		await self.revoke( firestarter, 'Websocket', async function (firestarter, websocket) {
			return 'ok'
		})
		return 'ok'
	},
	dosocket: async function ( firestarter, serviceInInterest ) {
		var self = this
		if ( !self.Websocket )
			self.toWebsocket.push( { firestarter: firestarter, serviceInInterest: serviceInInterest } )
		else
			await self.publish( firestarter, 'Websocket', function (firestarter, prefix, service) {
				if ( serviceInInterest && serviceInInterest !== service ) return 'ok'

				let path = firestarter.division + '.' + prefix + '.' + service
				self.options.logger.radiationlog( null, 'Websocket service event has been activated: ' + path, {}, self.options.logLevel )
				if ( !self.Websocket.includes(path) )
					self.Websocket.push( path )
			} )
		return 'ok'
	}
}
