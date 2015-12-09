var Clerobee = require('clerobee');
var clerobee = new Clerobee( 32 );

function pick( object, properties ){
	var res = {};
	properties.forEach( function( property ){
		res[ property ] = object[ property ];
	} );
	return res;
}

var context = function( firestarter, prefix ){
	var reference = prefix.replace('.', '/');
	var division =  firestarter.division ? '/' + firestarter.division.replace('.', '/') : '';
	return division + '/' + reference;
};

module.exports = {
	extractRequest: function( request ){
		var newRequest = pick(request, ['headers', 'url', 'method', 'originalUrl', 'body', 'query', 'params']);
		this.attributesRespected.forEach( function( attribute ){
			newRequest[ attribute ] = request[ attribute ];
		} );
		return newRequest;
	},
	unrest: function( name, firestarter ){
		var self = this;
		this.revoke( firestarter, 'REST', function(firestarter, path){
			self.restify.unpost( path.context + path.path );
		});
	},
	dorest: function( firestarter ){
		var self = this;

		if( !self.REST )
			return this.toREST.push( firestarter );

		this.publish( firestarter, 'REST', function(firestarter, prefix, service){
			var path = { path: '/' + service, context: context(firestarter, prefix) };
			var security = firestarter.object.security || {};
			security.options = true;
			path.protector = security.protector ? security.protector( service ) : null;
			self.restify.post( path, function( request, content, callback ){
				var params = content.params || content.parameters || [];
				var newRequest = self.extractRequest( request );
				self.notifyListeners( 'posted', [ self, { request: newRequest, content: content } ] );
				self.ignite( clerobee.generate(), { request: newRequest, content: content }, firestarter.division, prefix + '.' + service, params, callback );
			}, null, security );
			return path;
		} );
	},
	rester: function( rest, options ) {
		var self = this;

		this.restify = rest; //rest.create( options || {} );
		this.REST = { };
		this.logger.radiationlog( null, 'REST service has been activated.', {}, this.logLevel );

		this.toREST.forEach( function(firestarter){
			self.logger.radiationlog( null, 'Posteriorly executed publishing for REST...', { name: firestarter.name }, self.logLevel );
			self.dorest( firestarter );
		} );
		this.toREST.length = 0;

		if( rest.config )
			self.attributesRespected.forEach( function( attributeRespected ){
				if( !rest.config.attributesRespected.includes(attributeRespected) )
					rest.config.attributesRespected.push(attributeRespected);
			} );

		if( self.jsonrpcPath ){
			self.restify.post( { path: self.jsonrpcPath, context: '' }, function( request, content, callback ){
				self.processJsonRpc( request, content, callback );
			} );
		}

		return this.restify.processRequest();
	}
};
