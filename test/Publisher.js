var fs = require('fs');
var watch = require('watch');
var mkdirp = require('mkdirp');

var path = require('path');

module.exports = {
	name: 'Publisher',
	files: [],
	init: function (options) {
		if( !this.configs )
			this.configs = {};

		if( !this.globalConfig )
			this.globalConfig = {};
	},
	addGlobalConfig: function( config ){
		this.init();

		this.globalConfig = config;
	},
	addConfig: function( name, config ){
		this.init();

		this.configs[name] = config;
	},
	scheduleFile: function( folder, fileName ){
		var path = folder ? folder + '/' + fileName : fileName;
		if( this.files.indexOf( path ) === -1 )
			this.files.push( path );
	},
	igniteFiles: function( ){
		var self = this;
		var newFiles = self.files.slice();
		self.files.length = 0;
		newFiles.forEach( function(newFile){
			var fn = function(err, res){
				if( err ){
					console.error( err, newFile );
					self.inflicterContext.logger.error( 'Failed to publish', newFile, err );
				}
			};
			if( fs.existsSync( newFile ) ){
				var component = require( newFile.substring( 0, newFile.length-3 ) );
				if( !component.name ) return;
				if( !component.adequate || component.adequate() ){
					self.ignite( 'Inflicter.addicts', component, self.configs[component.name] || self.globalConfig[component.name], fn );
				}
			} else
				self.ignite( 'Inflicter.detracts', path.basename( newFile, '.js'), fn );
		} );
	},
	readFiles: function( folder, matcher, callback ){
		var self = this;
		fs.readdir(folder, function(err, files){
			if(err)
				console.error( err );
			else {
				for(var i=0; i<files.length; i+=1)
					if( matcher(files[i]) )
						self.scheduleFile( folder, files[i] );
			}
			if( callback )
				callback();
		});
	},
	watch: function( folder, timeout, pattern, callback ) {
		var self = this;
		var extension = '.js';
		var matcher = function(filePath){ return pattern ? pattern.test(filePath) : filePath.endsWith( extension ); };

		self.close();

		if( !fs.existsSync( folder ) )
			mkdirp.sync( folder );

		self.files = [];

		var isComponent = function(filePath, stat) {
			return !stat.isDirectory() && matcher(filePath);
		};
		self.readFiles( folder, matcher, function(){
			watch.createMonitor( folder, function (monitor) {
				self.monitor = monitor;
				var handler = function (f, stat) {
					if( isComponent( f, stat ) )
						self.scheduleFile( null, f );
				};
				['created', 'removed', 'changed'].forEach(function(eventName){
					monitor.on( eventName, handler );
				});
			});
			if( timeout && timeout > 0 )
				self.intervalObject = setInterval( function(){ self.igniteFiles( ); }, timeout );
			else
				self.igniteFiles( );

			if( callback )
				callback();
		});
	},
	close: function( callback ) {
		if( this.monitor )
			this.monitor.stop();

		if( this.intervalObject )
			clearInterval( this.intervalObject );

		if( callback )
			callback( null, 'Stopped' );
	}
};
