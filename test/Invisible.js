module.exports ={
	name: 'Invisible',
	rest: true,
	websocket: true,
	greet: function( message, terms, ignite, callback ){
		callback( null, message );
	}
};
