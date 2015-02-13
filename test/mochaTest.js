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

var inflicter, radiation, server, julie, marie;

var rest = require('connect-rest');
var httphelper = rest.httphelper;

var io = require('socket.io');
var ioclient = require('socket.io-client');
var socketClient;

describe("harcon-radiation", function () {

	before(function(done){
		inflicter = new Inflicter( { logger: logger, idLength: 32, marie: {greetings: 'Hi!'} } );
		radiation = new Radiation( inflicter, { name:'Radiation', hideInnerServices:false, closeRest:false } );

		julie = {
			name: 'julie',
			context: 'morning',
			rest: true,
			websocket: true,
			wakeup: function( greetings, ignite, callback ){
				callback( null, 'Thanks. ' + greetings );
			}
		};
		marie = {
			name: 'marie',
			division: 'charming',
			context: 'morning',
			rest: true,
			websocket: true,
			greetings: function( greetings, ignite, callback ){
				callback( null, 'Merci bien. ' + greetings );
			},
			terminus: function( greetings, terms, ignite, callback ){
				console.log('TERMS::', terms);
				callback( null, 'Merci bien. ' + greetings );
			}
		};

		inflicter.addicts( julie ); inflicter.addicts( marie );

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
		app.use( radiation.rester( rest, options ) );

		var port = process.env.PORT || 8080;
		server = http.createServer(app);

		io = radiation.io( io.listen( server ) );

		//inflicter.addicts( julie ); inflicter.addicts( marie );

		server.listen( port, function() {
			console.log( 'Running on http://localhost:' + port);

			done();
		});

		socketClient = ioclient( 'http://localhost:8080/Inflicter' );
	});

	describe("Test Websocket calls", function () {
		it('Division-less', function(done){
			socketClient.emit('ignite', { id: '21', event: 'morning.wakeup', parameters: [ 'Helloka!' ] } );
			socketClient.on('done', function (data) {
				if( data.id === '21' ){
					expect( data.result ).to.include( 'Thanks. Helloka!' );
					done( );
				}
			});
			socketClient.on('error', function (data) {
				if( data.id === '21' )
					done( new Error(data) );
			});
		});
		it('Division-cared', function(done){
			socketClient.emit('ignite', { id: '12', division: 'charming', event: 'morning.greetings', parameters: [ 'Szióka!' ] } );
			socketClient.on('done', function (data) {
				if( data.id === '12' ){
					expect( data.result ).to.include( 'Merci bien. Szióka!' );
					done( );
				}
			});
			socketClient.on('error', function (data) {
				if( data.id === '12' )
					done( new Error(data) );
			});
		});
	});

	describe("Test REST calls", function () {
		it('Division-less', function(done){
			httphelper.generalCall( 'http://localhost:8080/morning/wakeup', 'POST', {'x-api-key':'849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
				function(err, result, status){
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Thanks. Helloka!' );

					done( );
				}
			);
		});
		it('Division-cared', function(done){
			httphelper.generalCall( 'http://localhost:8080/charming/morning/greetings', 'POST', {'x-api-key':'849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function(err, result, status){
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Merci bien. Szióka!' );

					done( );
				}
			);
		});
		it('Division-cared with terms', function(done){
			httphelper.generalCall( 'http://localhost:8080/charming/morning/terminus', 'POST', {'x-api-key':'849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function(err, result, status){
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Merci bien. Szióka!' );

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
	});

	after(function(done){
		if( socketClient )
			socketClient.disconnect();
		if( server )
			server.close( function(){ console.log('Node stopped'); done(); } );
		if( inflicter )
			inflicter.close();
		if( !server )
			done();
	});
});
