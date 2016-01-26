var attributesRespected = [ 'user', 'files' ];

module.exports = {
	config: function( inflicter ){
		return {
			name: 'Radiation',
			hideInnerServices: true,
			innerServicesPrefix: '_',
			innerServicesFn: function(){ return false; },
			level: 'info',
			logger: inflicter.logger,
			attributesRespected: attributesRespected,
			inboundShifts: false,
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
			}
		};
	}
};
