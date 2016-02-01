var Clerobee = require('clerobee');
var clerobee = new Clerobee( 32 );

function pick( object, properties ){
	var res = {};
	properties.forEach( function( property ){
		res[ property ] = object[ property ];
	} );
	return res;
}

var getContext = function( firestarter, prefix ){
	var reference = prefix.replace('.', '/');
	var division =  firestarter.division ? '/' + firestarter.division.replace('.', '/') : '';
	return division + '/' + reference;
};

module.exports = {
	extractRequest: function( request ){
		var newRequest = pick(request, ['headers', 'url', 'method', 'originalUrl', 'body', 'query', 'params']);
		this.options.attributesRespected.forEach( function( attribute ){
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
	dorest: function( firestarter, serviceInInterest ){
		var self = this;

		if( !self.REST )
			return this.toREST.push( { firestarter: firestarter, serviceInInterest: serviceInInterest } );

		this.publish( firestarter, 'REST', function(firestarter, prefix, service){
			if( serviceInInterest && serviceInInterest !== service ) return null;
			if( self.options.rest.ignoreRESTPattern ) return null;

			var path = { path: '/' + service, context: getContext(firestarter, prefix) };
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

		self.restify = rest; //rest.create( options || {} );
		self.REST = { };
		self.options.logger.radiationlog( null, 'REST service has been activated.', {}, self.options.logLevel );

		self.toREST.forEach( function( reference ){
			self.options.logger.radiationlog( null, 'Posteriorly executed publishing for REST...', { name: reference.firestarter.name }, self.options.logLevel );
			self.dorest( reference.firestarter, reference.serviceInInterest );
		} );
		self.toREST.length = 0;

		if( rest.config )
			self.options.attributesRespected.forEach( function( attributeRespected ){
				if( !rest.config.attributesRespected.includes(attributeRespected) )
					rest.config.attributesRespected.push(attributeRespected);
			} );

		if( self.options.rest.harconrpcPath ){
			self.options.logger.radiationlog( null, 'HarconREST has been activated.', { path: self.options.rest.harconrpcPath }, self.options.logLevel );
			self.restify.post( { path: self.options.rest.harconrpcPath, context: '' }, function( request, content, callback ){
				var newRequest = self.extractRequest( request );
				self.notifyListeners( 'posted', [ self, { request: newRequest, content: content } ] );
				self.ignite( content.id || clerobee.generate(), { request: newRequest, content: content }, content.division, content.event, content.params, callback );
			} );
		}

		if( self.options.rest.jsonrpcPath ){
			self.options.logger.radiationlog( null, 'JSONRPC on REST has been activated.', { path: self.options.rest.jsonrpcPath }, self.options.logLevel );
			self.restify.post( { path: self.options.rest.jsonrpcPath, context: '' }, function( request, content, callback ){
				self.processJsonRpc( request, content, callback );
			} );
		}

		return this.restify.processRequest();
	}
};
