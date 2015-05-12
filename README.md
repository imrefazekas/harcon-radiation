Harcon-Radiation - An extension to the [harcon](https://github.com/imrefazekas/harcon) library to automatically expose selected entities through REST and/or Websocket.

[![NPM](https://nodei.co/npm/harcon-radiation.png)](https://nodei.co/npm/harcon-radiation/)


================
[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) is a small, yet handy tool extending the [harcon](https://github.com/imrefazekas/harcon) library to provide a [REST](http://en.wikipedia.org/wiki/Representational_state_transfer)-, and [Websocket](http://en.wikipedia.org/wiki/WebSocket)-based interface to it.

Every time you publish or revoke an object-based entity, the [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) reacts to the changes and maintain the interfaces transparently.

## Installation

$ npm install harcon-radiation

## Quick setup
```javascript
var harcon = new Harcon( { ... } );
var radiation = new Radiation( harcon );
var rest = require('connect-rest');
var connect = require('connect');
...
var app = connect();
...
app.use( radiation.rester( rest, options ) ); // Activates the REST services
...
server = http.createServer(app);
io = radiation.io( io.listen( server ) ); // Activates the Websocket services
...
harcon.addicts( {
	name: 'julie',
	context: 'book',
	rest: true,
	websocket: true,
	log: function( data, callback ){
		callback( null, 'Done.' );
	}
} );
```
The example shows how you can attach the __radiation__ to a connect/express instance and link to your _harcon_ instance. You can activate the REST and Websocket interfaces only or both as you wish.
Any object-based entities published to [harcon](https://github.com/imrefazekas/harcon) possessing attributes __'rest'__ and __'websocket'__ will be exposed through those interfaces automatically.


## Regulate publishing process

The default behavior is to publish all services. However, one can define rules to make exceptions. By setting the option _hideInnerServices_, [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) will hide inner services and won't publish them

```javascript
var radiation = new Radiation( harcon, { hideInnerServices: true } );
```

[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) ignores a service in 2 cases:

- its name starts with a given prefix
```javascript
	var radiation = new Radiation( harcon, { hideInnerServices: true, innerServicesPrefix: '_' } );
```

- its name matches to a given pattern
```javascript
	var radiation = new Radiation( harcon, { hideInnerServices: true, innerServicesFn: function(name){
		return name.startsWith('inner') || name.startsWith('sys');
	} } );
```

## Call in from remote

REST interface means a POST service using the same addressing logic as was implemented in harcon.
An division-aware URI composed by name or context and a service function's name

	post -> 'http://localhost:8080/Inflicter/book/log'

with body

	{ params: [ 'Hello!'] }

will do perfectly.

Websockets is also straightforward:

	var socket = ioclient( 'http://localhost:8080/Inflicter' );
	socket.emit('ignite', { division: 'Inflicter', event: 'book.log', params: [ 'Helloka!' ] } );

The lib will open the namespace 'Inflicter' listening incoming packets. By sending an __'ignite'__ message passing the communication you want to deliver will do fine.

## License

(The MIT License)

Copyright (c) 2015 Imre Fazekas

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


## Bugs

See <https://github.com/imrefazekas/harcon-radiation/issues>.

## Changelog

- 0.1.0 : initial release
