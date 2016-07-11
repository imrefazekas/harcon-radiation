'use strict'

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
	sendJSONSocketError: function ( id, err, errMessage, socket, data ) {
		socket.emit( 'done', {
			jsonrpc: '2.0',
			id: id,
			error: { code: err.code, message: errMessage || err.message }
		} )
		this.options.logger.radiationlog( err, errMessage, data )
	},
	sendJSONAnswer: function ( id, data, callback ) {
		callback( null, {
			jsonrpc: '2.0',
			id: id,
			result: data
		} )
	},
	sendJSONSocketAnswer: function ( id, data, socket ) {
		socket.emit( 'done', {
			jsonrpc: '2.0',
			id: id,
			result: data
		} )
	},
	checkJSONData: function ( content ) {
		return ( content.jsonrpc !== '2.0' || !_.isString( content.method ) || !_.isArray( content.params ) || !_.isString( content.id ) )
	},
	processJsonRpc: function ( request, content, callback ) {
		let self = this
		if ( self.checkJSONData( content ) )
			return self.sendJSONError( content.id, JSON_RPC_ERRORS.parseError, '', callback )

		let params = content.params || []
		let newRequest = self.extractRequest( request )
		self.ignite( content.id, { request: newRequest, content: content }, '', content.method, params, function (err, res) {
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
	processJSONSocketData: function ( socket, data ) {
		let self = this
		if ( _.isString(data) )
			data = JSON.parse( data )

		if ( data.error )
			return self.sendJSONSocketError( data.id, JSON_RPC_ERRORS.internalError, data.error.message, socket, data )

		if ( self.checkJSONData( data ) )
			return self.sendJSONSocketError( data.id, JSON_RPC_ERRORS.parseError, '', socket, data )

		let params = data.params || []
		self.ignite( data.id, { content: data }, data.division || '', data.method, params, function (err, res) {
			let assigner = self.options.assignSocket( data.method )
			assigner( data.terms, err, res, socket, function (err, res) {
				if ( err ) return self.sendJSONSocketError( data.id, JSON_RPC_ERRORS.internalError, err.message, socket, data )

				let answer = res && res.length > 0 ? res[0] : null
				self.sendJSONSocketAnswer( data.id, answer, socket )
			} )
		} )
	}
}
