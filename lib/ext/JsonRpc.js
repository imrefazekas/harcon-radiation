var _ = require('isa.js');

var JSON_RPC_ERRORS = {
	parseError: { code: -32700, message: 'Parse error' },
	invalidRequest: { code: -32600, message: 'Invalid Request' },
	methodNotFound: { code: -32601, message: 'Method not found' },
	invalidParams: { code: -32602, message: 'Invalid params' },
	internalError: { code: -32603, message: 'Internal error' },
	serverError: { code: -32000, message: 'Server error' }
};

module.exports = {
	sendJSONError: function( id, err, errMessage, callback ){
		var self = this;
		callback( null, {
			jsonrpc: '2.0',
			id: id,
			error: { code: err.code, message: errMessage || err.message }
		} );
	},
	sendJSONAnswer: function( id, data, callback ){
		var self = this;
		callback( null, {
			jsonrpc: '2.0',
			id: id,
			result: data
		} );
	},
	processJsonRpc: function( request, content, callback ){
		var self = this;
		if( content.jsonrpc !== '2.0' || !_.isString( content.method ) || !_.isArray( content.params ) || !_.isString( content.id ) )
			return self.sendJSONError( content.id, JSON_RPC_ERRORS.parseError, '', callback );

		var params = content.params || [];
		var newRequest = self.extractRequest( request );
		self.ignite( content.id, { request: newRequest, content: content }, '', content.method, params, function(err, res){
			if( err ) return self.sendJSONError( content.id, JSON_RPC_ERRORS.internalError, err.message, callback );

			var data = res && res.length>0 ? res[0] : null;
			self.sendJSONAnswer( content.id, data, callback );
		} );
	}
};
