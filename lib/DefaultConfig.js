'use strict'

let _ = require('isa.js')

let attributesRespected = [ 'user', 'files' ]

module.exports = {
	config: function ( inflicter ) {
		return {
			name: 'Radiation',
			port: -1,
			hideInnerServices: true,
			innerServicesPrefix: '_',
			innerServicesFn: function () { return false },
			shield: function (division, event) {
				return event.startsWith( this.innerServicesPrefix )
			},
			level: 'info',
			logger: inflicter.logger,
			attributesRespected: attributesRespected,
			exposeVivid: true,
			inboundShifts: false,
			mimesis: {
				enabled: false,
				name: 'Mimesis',
				rest: true,
				websocket: true
			},
			rest: {
				closeRest: false,
				ignoreRESTPattern: false,
				jsonrpcPath: '', // '/jsonrpc',
				harconrpcPath: '' // '/' + inflicter.name
			},
			websocket: {
				socketPath: '/' + inflicter.name,
				jsonrpcPath: '', // '/jsonrpc',
				passthrough: false
			},
			assignSocket: function (event) {
				return function ( terms, err, res, socket, callback ) {
					callback( err, res )
				}
			},
			targetClientSockets: function ( namespace, target ) {
				let selector = target && !_.isString( target ) && _.isObject(target)
				let usersSocketIds = Object.keys(
					selector || target === '*' ? namespace.connected : namespace.adapter.rooms[ target ] || {}
				)

				let sockets = usersSocketIds.map( function (socketClientId) { return namespace.connected[socketClientId] } )
				return selector ? sockets.filter( function (socket) {
					for ( let key in Object.keys(selector) )
						if ( key && socket[key] !== selector[key] )
							return false
					return true
				} ) : sockets
			}
		}
	}
}
