let _ = require('isa.js')

let attributesRespected = [ 'user', 'files' ]

let innerServicesPrefix = '_'
module.exports = {
	config: function ( inflicter ) {
		return {
			name: 'Radiation',
			port: -1,
			hideInnerServices: true,
			innerServicesPrefix: innerServicesPrefix,
			innerServicesFn: function () { return false },
			shield: function (division, event) {
				return event.startsWith( innerServicesPrefix ) || (event.indexOf( '.' + innerServicesPrefix ) > -1)
			},
			level: 'info',
			logger: inflicter.logger,
			logLevel: 'info',
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
				harconPath: '/' + inflicter.name,
				jsonrpcPath: '', // '/jsonrpc',
				passthrough: false
			},
			assignSocket: function (event) {
				return async function ( terms, res, socket ) {
					return res
				}
			},
			targetClientSockets: function ( namespace, target ) {
				let selector = target && !_.isString( target ) && _.isObject(target)
				let usersSocketIds = Object.keys(
					selector || (target === '*' ? namespace.connected : namespace.adapter.rooms[ target ]) || {}
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
