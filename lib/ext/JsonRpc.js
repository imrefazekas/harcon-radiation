let _ = require('isa.js')

let Clerobee = require('clerobee')
let clerobee = new Clerobee( 16 )

let JSON_RPC_ERRORS = {
	parseError: { code: -32700, message: 'Parse error' },
	invalidRequest: { code: -32600, message: 'Invalid Request' },
	methodNotFound: { code: -32601, message: 'Method not found' },
	invalidParams: { code: -32602, message: 'Invalid params' },
	internalError: { code: -32603, message: 'Internal error' },
	serverError: { code: -32000, message: 'Server error' }
}

module.exports = {
	sendJSONError: function ( id, err, errMessage, callback ) {
		callback( null, {
			jsonrpc: '2.0',
			id: id,
			error: { code: err.code, message: errMessage || err.message }
		} )
	},
	sendJSONSocketError: function ( err, socket, data ) {
		socket.emit( 'success', {
			jsonrpc: '2.0',
			id: data.id,
			error: { code: err.code, message: err.message }
		} )
		throw err
	},
	sendJSONAnswer: function ( id, data, callback ) {
		callback( null, {
			jsonrpc: '2.0',
			id: id,
			result: data
		} )
	},
	sendJSONSocketAnswer: function ( id, data, socket ) {
		socket.emit( 'success', {
			jsonrpc: '2.0',
			id: id,
			result: data
		} )
	},
	checkJSONData: function ( content ) {
		if (_.isNumber( content.id ))
			content.id = content.id + ''
		return ( content.jsonrpc !== '2.0' || !_.isString( content.method ) || !_.isArray( content.params ) || !_.isString( content.id ) )
	},
	processJsonRpc: function ( request, content, callback ) {
		let self = this
		if ( self.checkJSONData( content ) )
			return self.sendJSONError( content.id, JSON_RPC_ERRORS.parseError, '', callback )

		let params = content.params || []
		let newRequest = self.extractRequest( request )
		self.ignite( content.id, { request: newRequest, content: content }, content.division || self.inflicter.division, content.method, params, function (err, res) {
			if ( err ) return self.sendJSONError( content.id, JSON_RPC_ERRORS.internalError, err.message, callback )

			let data = res && res.length > 0 ? res[0] : null
			self.sendJSONAnswer( content.id, data, callback )
		} )
	},
	broadcastToJSONSockets: function ( sockets, state ) {
		sockets.forEach( function (socket) {
			for ( let key of Object.keys( state ) )
				socket.emit( key, {
					jsonrpc: '2.0',
					id: clerobee.generate(),
					payload: state[key]
				} )
		} )
	},

	processJSONSocketData: async function ( socket, data ) {
		let self = this
		try {
			if ( _.isString(data) )
				data = JSON.parse( data )

			if ( data.error )
				throw JSON_RPC_ERRORS.internalError

			if ( self.checkJSONData( data ) )
				throw JSON_RPC_ERRORS.parseError

			let params = data.params || []
			let res = await self.ignite( data.id, { content: data }, data.division || self.inflicter.division, data.method, params)
			await self.options.assignSocket( data.event )( data.terms, res, socket )
			self.sendJSONSocketAnswer( data.id, res, socket )
		} catch (jsonError) { self.sendJSONSocketError( jsonError.code ? jsonError : JSON_RPC_ERRORS.internalError, socket, data ) }
	}
}
