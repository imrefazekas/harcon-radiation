let _ = require('isa.js')

let JSON_RPC_ERRORS = {
	parseError: { code: -32700, message: 'Parse error' },
	invalidRequest: { code: -32600, message: 'Invalid Request' },
	methodNotFound: { code: -32601, message: 'Method not found' },
	invalidParams: { code: -32602, message: 'Invalid params' },
	internalError: { code: -32603, message: 'Internal error' },
	serverError: { code: -32000, message: 'Server error' }
}

module.exports = {
	createJSONError: function ( id, err, errMessage ) {
		return {
			jsonrpc: '2.0',
			id: id,
			error: { code: err.code, message: errMessage || err.message }
		}
	},
	createJSONAnswer: function ( id, data ) {
		return {
			jsonrpc: '2.0',
			id: id,
			result: data
		}
	},
	sendJSONSocketError: function ( err, socket, data ) {
		socket.send( JSON.stringify( {
			jsonrpc: '2.0',
			id: data.id,
			error: { code: err.code, message: err.message }
		} ) )
		throw err
	},
	sendJSONSocketAnswer: function ( id, data, socket ) {
		socket.send( JSON.stringify( {
			jsonrpc: '2.0',
			id: id,
			result: data
		} ) )
	},
	checkJSONData: function ( content ) {
		if (_.isNumber( content.id ))
			content.id = content.id + ''
		return ( content.jsonrpc !== '2.0' || !_.isString( content.method ) || !_.isArray( content.params ) || !_.isString( content.id ) )
	},
	processJsonRpc: async function ( request, content ) {
		let self = this
		try {
			if ( self.checkJSONData( content ) )
				return self.createJSONError( content.id, JSON_RPC_ERRORS.internalError, '' )

			let params = content.params || []
			let newRequest = self.extractRequest( request )

			let res = await self.ignite( content.id, { request: newRequest, content: content }, content.division || self.inflicter.division, content.method, params )
			return self.createJSONAnswer( content.id, res )
		} catch ( err ) {
			return self.createJSONError( content.id, JSON_RPC_ERRORS.internalError, err.message )
		}
	},
	processJSONSocketData: async function ( socket, data ) {
		let self = this
		try {
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
