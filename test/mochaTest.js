var chai = require('chai'),
	should = chai.should(),
	expect = chai.expect;
var http = require('http');

var connect = require('connect');
var bodyParser = require('body-parser');

var Inflicter = require('harcon');

var Radiation = require('../lib/harcon-radiation');

var Logger = require('./WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true } );

var inflicter, radiation, server, julie;

var rest = require('connect-rest');
var httphelper = rest.httphelper;


describe("harcon-radiation", function () {

	before(function(done){
		inflicter = new Inflicter( { logger: logger, idLength: 32, marie: {greetings: 'Hi!'} } );
		radiation = new Radiation( inflicter );

		var app = connect()
			.use( bodyParser.urlencoded( { extended: true } ) )
			.use( bodyParser.json() )
			;
		var options = {
			context: '/api',
			logger: logger,
			apiKeys: [ '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9' ],
			discoverPath: 'discover',
			protoPath: 'proto'
		};
		app.use( radiation.rester( options ) );

		julie = {
			name: 'julie',
			context: 'morning',
			rest: true,
			wakeup: function( greetings, ignite, callback ){
				callback( null, 'Thanks. ' + greetings );
			}
		};
		inflicter.addicts( julie );

		var port = process.env.PORT || 8080;
		server = http.createServer(app);

		server.listen( port, function() {
			console.log( 'Running on http://localhost:' + port);

			done();
		});
	});

	it('Test REST calls', function(done){
		httphelper.generalCall( 'http://localhost:8080/morning/wakeup', 'POST', {'x-api-key':'849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
			function(err, result, status){
				should.not.exist(err); should.exist(result);

				expect( result ).to.include( 'Thanks. Helloka!' );

				done( );
			}
		);
	});

	it('Test Revoke', function(done){
		inflicter.detracts( julie );

		setTimeout(function(){
			httphelper.generalCall( 'http://localhost:8080/morning/wakeup', 'POST', {'x-api-key':'849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
				function(err, result, status){
					expect( status.statusCode ).to.equal( 404 );
					done( );
				}
			);
		}, 1000);
	});

	after(function(done){
		if( server )
			server.close( function(){ console.log('Node stopped'); done(); } );
		if( inflicter )
			inflicter.close();
		if( !server )
			done();
	});
});
