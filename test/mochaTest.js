var chai = require('chai'),
	should = chai.should(),
	expect = chai.expect;
var http = require('http');

var connect = require('connect');
var bodyParser = require('body-parser');

var Harcon = require('harcon');

var Radiation = require('../lib/harcon-radiation');

var Logger = require('./WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true } );

var harcon, radiation, server, julie, marie;

var Rest = require('connect-rest');
var httphelper = Rest.httphelper();

var io = require('socket.io');
var ioclient = require('socket.io-client');
var socketClient;

var path = require('path');
var Publisher = require('./Publisher');

describe("harcon-radiation", function () {

	before(function(done){
		harcon = new Harcon( { name: 'King', logger: logger, idLength: 32, marie: {greetings: 'Hi!'} } );
		radiation = new Radiation( harcon, { name: 'Radiation', hideInnerServices: false, closeRest: false } );
		radiation.listen( {
			shifted: function( radiation, object ){
				console.log( 'shifted', object );
			},
			posted: function( radiation, request ){
				console.log( 'posted', request );
			},
			ioCreacted: function( radiation, namespaceSocker ){
				console.log( 'ioCreacted', namespaceSocker );
			},
			ioConnected: function( radiation, socket ){
				console.log( 'ioConnected' );
			}
		} );

		julie = {
			name: 'julie',
			context: 'morning',
			rest: true,
			websocket: true,
			wakeup: function( greetings, ignite, callback ){
				this.shifted( { data: 'content' } );
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

		harcon.addicts( julie ); harcon.addicts( marie );

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
		var rester = Rest.create( options );
		app.use( radiation.rester( rester ) );

		var port = process.env.PORT || 8080;
		server = http.createServer(app);

		io = radiation.io( io.listen( server ) );

		//harcon.addicts( julie ); harcon.addicts( marie );

		socketClient = ioclient( 'http://localhost:8080/King' );

		harcon.addicts( Publisher );
		Publisher.watch( path.join(__dirname, 'comps'), -1 );

		server.listen( port, function() {
			console.log( 'Running on http://localhost:' + port);

			done();
		});
	});

	describe("Test Websocket calls", function () {
		it('Division-less', function(done){
			socketClient.emit('ignite', { id: '21', division: 'King', event: 'morning.wakeup', parameters: [ 'Helloka!' ] } );
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
			socketClient.emit('ignite', { id: '12', division: 'King.charming', event: 'morning.greetings', parameters: [ 'Szióka!' ] } );
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
			httphelper.generalCall( 'http://localhost:8080/King/morning/wakeup', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
				function(err, result, status){
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Thanks. Helloka!' );

					done( );
				}
			);
		});
		it('Division-cared', function(done){
			httphelper.generalCall( 'http://localhost:8080/King/charming/morning/greetings', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function(err, result, status){
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Merci bien. Szióka!' );

					done( );
				}
			);
		});
		it('Division-cared with terms', function(done){
			httphelper.generalCall( 'http://localhost:8080/King/charming/morning/terminus', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Szióka!'] }, 'application/json', logger,
				function(err, result, status){
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Merci bien. Szióka!' );

					done( );
				}
			);
		});
		it('Test Revoke', function(done){
			harcon.detracts( julie );

			setTimeout(function(){
				httphelper.generalCall( 'http://localhost:8080/King/morning/wakeup', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: ['Helloka!'] }, 'application/json', logger,
					function(err, result, status){
						expect( status.statusCode ).to.equal( 404 );
						done( );
					}
				);
			}, 1000);
		});
	});

	describe("Test Publishing calls", function () {
		it('Calling Automata', function( done ){
			httphelper.generalCall( 'http://localhost:8080/King/Automata/act', 'POST', {'x-api-key': '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9'}, null, { params: [ ] }, 'application/json', logger,
				function(err, result, status){
					console.log( err, result, status );
					should.not.exist(err); should.exist(result);

					expect( result ).to.include( 'Done.' );

					done( );
				}
			);
		});
	});

	after(function(done){
		if( socketClient )
			socketClient.disconnect();
		if( server )
			server.close( function(){ console.log('Node stopped'); done(); } );
		if( harcon )
			harcon.close();
		if( !server )
			done();
	});
});
