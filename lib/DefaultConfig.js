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
			assignSocket: async function (event, terms, res, socket ) {
				return 'ok'
			},
			identifySockets: async function ( sockets, target ) {
				return sockets
			}
		}
	}
}
