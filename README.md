Harcon-Radiation - An extension to the [harcon](https://github.com/imrefazekas/harcon) library to automatically expose entities through REST and Websocket.

[![NPM](https://nodei.co/npm/harcon-radiation.png)](https://nodei.co/npm/harcon-radiation/)


================
[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) is a small, yet handy tool extending the [harcon](https://github.com/imrefazekas/harcon) library to provide a [REST](http://en.wikipedia.org/wiki/Representational_state_transfer)-, and [Websocket](http://en.wikipedia.org/wiki/WebSocket)-based interface to it.

Every time you publish or revoke an object-based entity, the [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) will maintain the interfaces transparently.

## Installation

$ npm install harcon-radiation

## Quick setup
```javascript
var inflicter = new Inflicter( { ... } );
var radiation = new Radiation( inflicter );

var app = connect();
...
app.use( radiation.rester( options ) ); // Activates the REST services
...
server = http.createServer(app);
io = radiation.io( io.listen( server ) ); // Activates the Websocket services
...
inflicter.addicts( {
	name: 'julie',
	context: 'book',
	rest: true,
	websocket: true,
	log: function( data, callback ){
		callback( null, 'Done.' );
	}
} );
```
The example shows how you can attach the __radiation__ to a connect/express instance. You can activate the REST and Websocket interfaces or both as you wish.
Any object-based entities published to [harcon](https://github.com/imrefazekas/harcon) possessing attributes __'rest'__ and __'websocket'__ will be exposed through those interfaces automatically.

## Access service functions

REST interface means a POST service using an URI composed by context and service function's name

	post -> 'http://localhost:8080/book/log'

with body

	{ params: [ 'Hello!'] }

will do perfectly.

Websockets is also straightforward:

	var socket = ioclient( 'http://localhost:8080/Inflicter' );
	socket.emit('ignite', { event: 'book.log', params: [ 'Helloka!' ] } );

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
