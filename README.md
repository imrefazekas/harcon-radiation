Harcon-Radiation - An extension to the [harcon](https://github.com/imrefazekas/harcon) library to automatically expose selected entities through REST and/or Websocket.

[![NPM](https://nodei.co/npm/harcon-radiation.png)](https://nodei.co/npm/harcon-radiation/)

!Note: Please be aware, that from version 1.3.0, harcon-radiation requires Node 4.0.0 or above...

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
The example shows how you can attach the __radiation__ to a connect/express instance and link to your _harcon_ instance. You can activate the REST and Websocket interfaces.
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

## Call REST

There are 3 options to expose services through REST-like interface:

- RESTful: each service will be exposed on different URI according the name of the division, context/entity and service...
- [JSON-RPC 2.0](http://www.jsonrpc.org/specification): one single URI acccepting JSON-RPC 2.0 calls
- Harcon RPC: one single URI accepting a harcon JSON

By default, option 1 is turned on, and the rest options are passive.


#### RESTful

[RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) interface means a POST service using the  addressing logic implemented in harcon.
To address a service exposed, you have to compose a URI using the name of the division[, context], entity and service. By calling the following URI:

	post -> 'http://localhost:8080/Harcon/book/log'

with a body of

	{ params: [ 'Hello!'] }

will address the service _'log'_ of the component _'book'_ in the division _'Harcon'_.
The of the entity will be sent as JSON.


#### JSON-RPC 2.0

[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) supports JSON-RPC 2.0 if you create the instace as follows:

```javascript
	var radiation = new Radiation( harcon, rest: { jsonrpcPath: '/RPCTwo' } );
```

This will accept POST request on the path _'/RPCTwo'_ respecting the JSON-RPC 2.0 standard.

Note: be aware the limitations of JSON-RPC. It does not support orchestration like divisions or contexts, therefore addressing should be limited to __entityname.service__, subdomains/subcontexts cannot be addressed.


#### Harcon-RPC 2.0

The following settings will activate the Harcon-RPC option on URI _'/Harcon'_:

```javascript
	var radiation = new Radiation( harcon, { rest: { harconrpcPath: '/Harcon' } } );
```

By sending the following JSON to the address, you can address the method _'terminus'_ of the entity _'marie'_ in the division _'King.charming'_:

```javascript
	{ division: 'King.charming', event: 'marie.terminus', params: ['Szióka!'] }
```


## Websockets

Using Websockets is also straightforward. By default, the URI will be the name of your Harcon instance. You can override it by the following config:

```javascript
	var radiation = new Radiation( harcon, { websocket: { socketPath: '/Socket' } } );
```

Send packet to that address:

	var socket = ioclient( 'http://localhost:8080/Socket' );
	socket.emit('ignite', { id: '10', division: 'Inflicter', event: 'book.log', params: [ 'Helloka!' ] } );

This will send the JS object to the room 'Socket'. By sending an __'ignite'__ message and passing the communication object you want to deliver will call the function.

The response will be sent as _'done'_ or _'error'_ message depending on the result.

Note: The ID is highly recommended to be passed to differentiate the incoming answer packets.


#### JSON-RPC 2.0 over Websocket

This service can be turned on by the following configuration:

```javascript
	var radiation = new Radiation( harcon, { websocket: { jsonrpcPath: '/SocketRPC' } } );
```

It will accept and send JSON-RPC JSON packets...


## Emit message to websocket listeners

You can send out / broadcast messages to connected listeners if your business entity calls the method _'shifted'_, which is a built-in service of harcon letting entities to inform the system about state changes.
[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) uses this mechanism to send out those messages to the websocket listeners.

```javascript
	this.shifted( { mood: 'happy' } );
```

That will send the message 'mood' to the connected clients with the data _'happy'_.
All properties of the object sent will be turned into separate messages to be broadcasted. And the payload of the messages will be set by the value of the given property.

Note: Considering the nature of the JSON-RPC 2.0, this level of service is available only for the _'normal'_ websockets clients.


## Security

[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) is using [connect-rest](https://github.com/imrefazekas/connect-rest) inside and allows you to use the security features of that REST lib.
Your components might possess a __protector__ function which should retrieve [protector function](https://github.com/imrefazekas/connect-rest#protector) used by the [connect-rest](https://github.com/imrefazekas/connect-rest) when it is called.
The service parameter can be used to differentiate the different security aspects your services cover.

```javascript
harcon.addicts( {
	name: 'julie',
	rest: true,
	security: {
		protector: function(service){
			return function( req, res, pathname, path, callback ){
				callback();
			}
		}
	}
} );
```

About the protector functions, please find the description [here](https://github.com/imrefazekas/connect-rest#protector).

Note: this feature is valid only for REST option 1.


## License

(The MIT License)

Copyright (c) 2016 Imre Fazekas

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

- 1.6: JSON-RPC support added
- 1.1-1.4: refactoring
- 1.0.0 : moving to harcon v2
- 0.8.0 : addressing via names added
- 0.5.0 : refactoring and moving to harcon v1
- 0.1.0 : initial release
