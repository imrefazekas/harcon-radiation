/* jshint bitwise: false */
if( !Array.prototype.remove )
	Array.prototype.remove = function( obj ){
		var idx = this.findIndex( obj );
		if( idx > -1 )
			this.splice( idx, 1 );
		return this;
	};
if( !Array.prototype.contains )
	Array.prototype.contains = function( object ){
		for( var i = 0; i<this.length; i+=1){
			if( object === this[i] ) return true;
		}
		return false;
	};
if( !Array.prototype.find )
	Array.prototype.find = function( fn ){
		for( var i = 0; i<this.length; i+=1){
			if( fn(this[i], i, this) ) return this[i];
		}
		return null;
	};
if( !Array.prototype.findIndex )
	Array.prototype.findIndex = function( fn ){
		for( var i = 0; i<this.length; i+=1){
			if( fn(this[i], i, this) ) return i;
		}
		return -1;
	};
if (!String.prototype.endsWith) {
	Object.defineProperty(String.prototype, 'endsWith', {
		value: function (searchString, position) {
			var subjectString = this.toString();
			if (position === undefined || position > subjectString.length) {
				position = subjectString.length;
			}
			position -= searchString.length;
			var lastIndex = subjectString.indexOf(searchString, position);
			return lastIndex !== -1 && lastIndex === position;
		}
	});
}
if (!String.prototype.startsWith) {
	Object.defineProperty(String.prototype, 'startsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (searchString, position) {
			position = position || 0;
			return this.lastIndexOf(searchString, position) === position;
		}
	});
}
if( !Number.prototype.format )
	Number.prototype.format = function(n, x, s, c) {
		var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
			num = this.toFixed(Math.max(0, ~~n));

		return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + s);
	};