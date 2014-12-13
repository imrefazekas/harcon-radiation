var rest = require('connect-rest');

function Radiation( inflicter, options ){
	var opts = options || {};
	this.logger = opts.logger || inflicter.logger;
	var self = this;
	self.services = { };
	this.firestarter = inflicter.addicts( {
		name: opts.name || 'Radiation',
		options: opts,
		context: inflicter.name,
		castOf: function( name, firestarter ){
			if( firestarter.object && firestarter.object.rest )
				self.unpublish( name, firestarter );
		},
		affiliate: function( firestarter ){
			if( firestarter.object && firestarter.object.rest )
				self.publish( firestarter );
		},
		close: function(){
			rest.shutdown();
		}
	} );
}

var radiation = Radiation.prototype;

radiation.unpublish = function( name, firestarter ){
	var self = this;
	if( self.services[ firestarter.name ] ){
		self.services[ firestarter.name ].forEach(function(path){
			rest.unpost( path.context + path.path );
			self.logger.debug( 'Service has been revoked.', firestarter.name, path );
		});
	}
};

radiation.publish = function( firestarter ){
	var self = this;
	if( !self.restOptions )
		return self.logger.warn( 'REST has not been started yet.', firestarter.name );

	if( self.services[ firestarter.name ] )
		return self.logger.warn( 'Component has been published already.', firestarter.name );

	self.services[ firestarter.name ] = [];
	firestarter.services().forEach( function(service){
		var path = { path: '/' + service, context: '/' + firestarter.context };
		rest.post( path, function( request, content, callback ){
			var parameters = [ firestarter.context + '.' + service ].concat( content.params || content.parameters || [] );
			parameters.push( function(err, res){
				return callback( err, res );
			} );
			self.firestarter.ignite.apply( self.firestarter, parameters );
		} );
		self.services[ firestarter.name ].push( path );

		self.logger.debug( 'Service has been published.', firestarter.name, path );
	} );
};

radiation.rester = function( options ) {
	this.restOptions = options || {};
	this.logger.debug( 'REST Service has been activated.', this.restOptions );
	return rest.rester( options );
};

module.exports = Radiation;
