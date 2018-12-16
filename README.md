Harcon-Radiation - An extension to the [harcon](https://github.com/imrefazekas/harcon) library to automatically expose services through REST and/or Websocket using Harcon and JsonRPC message formats.

[![NPM](https://nodei.co/npm/harcon-radiation.png)](https://nodei.co/npm/harcon-radiation/)
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

================
[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) is a small tool extending the [harcon](https://github.com/imrefazekas/harcon) library to provide a [REST](http://en.wikipedia.org/wiki/Representational_state_transfer)-, and [Websocket](http://en.wikipedia.org/wiki/WebSocket)-based interface. Following your configuration, your services within your entities will be exposed through REST / Websocket automatically.

Every time you publish or revoke an object-based entity, the [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) reacts to the changes and maintain the interfaces transparently.

!Note: From version 8.0.0, harcon supports only Node v8 and await functions. For callback-based version please use v7 or below.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Installation

$ npm install harcon-radiation

## Quick setup

```javascript
let serverConfig = {}
let harconConfig = {}
let radiationConfig = {}
let Server = require('harcon-radiation/util/Server')
let server = server = new Server( {
	name: 'King',
	server: serverConfig,
	harcon: harconConfig,
	radiation: radiationConfig
} )
await server.init()
```

The example shows how you can create a server instance easily. The server is a [fastify](https://www.fastify.io) instance using several built-in plugins like [fastify-ws](https://github.com/gj/fastify-ws) providing websocket support.
The server initiates the [harcon](https://github.com/imrefazekas/harcon) and the [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) as well as configured.

The main idea is to expose any object-based entities published to [harcon](https://github.com/imrefazekas/harcon) possessing attributes __'rest'__ and __'websocket'__ through those REST and / or Websocket interfaces automatically without any action required.


## Regulate publishing process

The default behavior is to publish all user-defined services. However, one can define rules to make exceptions. By setting the option _hideInnerServices_, [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) will hide inner services and won't publish them

```javascript
var radiationConfig = { ..., hideInnerServices: true }
```

[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) can be configured in 2 ways:

- to define a prefix string
```javascript
var radiationConfig = { ..., hideInnerServices: true, innerServicesPrefix: '_' } )
```

- to define a function evaluating the name of the functions
```javascript
var radiationConfig = { ..., hideInnerServices: true, innerServicesFn: function(name){
	return name.startsWith('inner') || name.startsWith('sys')
} } )
```


## Call REST

There are 3 ways to expose services through REST:

- RESTful: each service will be exposed on different URI according the name of the division, context/entity and service. The general URI pattern is __/{division}/{entity}/{event}__. Of course, each part can be a qualified name depending on your harcon orchestration.
- [JSON-RPC 2.0](http://www.jsonrpc.org/specification): one single URI acccepting JSON-RPC 2.0 calls as specification defines.
- Harcon RPC: one single URI accepting a harcon JSON messages

By default, option 3 is active, option 1 and 2 are passive.


#### RESTful

The following settings will activate the Harcon-RPC option on URI _'/Harcon'_:

```javascript
var radiationConfig = { ..., { rest: { ignoreRESTPattern: false } } )
```

[RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) interface accepts only POST messages. To address a service exposed, you have to compose a URI following the pattern __/{division}/{entity}/{event}__. For example:

	post -> 'http://localhost:8080/Harcon/book/log'

with a body of

	{ params: [ 'Hello!'] }

will address the service _'log'_ of the component _'book'_ in the division _'Harcon'_.
The answer of the entity will be sent back as JSON.


#### JSON-RPC 2.0

[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) supports JSON-RPC 2.0 if you create the instace as follows:

```javascript
var radiationConfig = { ..., rest: { jsonrpcPath: '/RPCTwo' } )
```

This will accept POST request on the path _'/RPCTwo'_ respecting the [JSON-RPC 2.0 standard](https://www.jsonrpc.org/specification).

Note: be aware the limitations of JSON-RPC. It does not support orchestration like divisions or contexts, therefore addressing should be limited to __entityname.service__, subdomains/subcontexts cannot be addressed.


#### Harcon-RPC

The following settings will activate the Harcon-RPC option on URI _'/Harcon'_:

```javascript
var radiationConfig = { ..., { rest: { harconrpcPath: '/Harcon' } } )
```

By sending the following JSON to the address, you can address the method _'terminus'_ of the entity _'marie'_ in the division _'King.charming'_:

```javascript
	{ division: 'King.charming', event: 'marie.terminus', params: ['Szióka!'] }
```


## Websockets

Using Websockets is also straightforward. The following config activates the interfaces accepting harcon JSON messages.

```javascript
var radiationConfig = { ..., { websocket: { harconPath: '/Socket' } } )
```

Send packet to that interface:

```javascript
const WebSocket = require('ws')
socketClient = new WebSocket('ws://localhost:8080/KingSocket')
...
socketClient.send( JSON.stringify( { id: mID, division: 'King', event: 'greet.simple', parameters: [ 'Bonjour!', 'Salut!' ] } ) )
socketClient.on('message', function (data) {
	data = JSON.parse( data )
	if ( data.error )
		console.error( new Error(data.error) )
	if ( data.id === mID )
		console.log( data.result )
})
```

This will send a JSON message to the server performing the service _simple_ of the entity _greet_ in division _King_.
The response will be sent back.
Note: An ID is highly recommended to be passed to differentiate the incoming answer packets.


#### JSON-RPC 2.0 over Websocket

The following config activates the interfaces accepting JSON RPC 2.0 JSON messages.

```javascript
var radiationConfig = { ..., { websocket: { jsonrpcPath: '/JSONSocket' } } )
```

Send packet to that interface:

```javascript
socketJsonrpcClient.send( JSON.stringify( { jsonrpc: '2.0', id: mID, division: 'King', method: 'Julie.wakeup', params: [ ] } ) )
socketJsonrpcClient.on('message', function (data) {
	data = JSON.parse( data )
	if ( data.error )
		console.error( new Error(data.error) )
	if ( data.id === mID )
		console.log( data.result )
})
```


## Emit message to websocket listeners

You can send out / broadcast messages to connected listeners if your business entity calls the method _'shifted'_, which is a built-in service of harcon letting entities to inform the system about state changes.
[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) uses this mechanism to send out those messages to the websocket listeners if configured.

```javascript
Katie = {
	name: 'Katie',
	context: 'morning',
	doBusiness: async function ( ) {
		await this.shifted( { mood: 'Pour toi, Marie' } )
		return 'ok'
	}
}
```

That will send the message 'mood' to the connected clients with the data _'Pour toi, Marie'_.
All properties of the object passed to the function _'shifted'_ will be turned into separate messages to be broadcasted. The payload of each message will be set by the value of the given property.

Note: Considering the nature of the JSON-RPC 2.0, this level of service requires to implement message handling beyond the reach of the specification.


## Distinguish websocket clients

By default, the function _'shifted'_ emits message to all listeners connected. Some business cases desire a more focused approach, targeting a defined group of clients.
[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) allows you to define 2 services to mark and select clients.

THe configuration file might define the following function:

```javascript
assignSocket: async function (event, terms, res, socket ) {
	return 'ok'
}
```

The function _'assignSocket'_ is called as the final step of each message processing giving the opportunity to mark the current client socket is needed as the example below demonstrates:

```javascript
assignSocket: async function (event, terms, res, socket ) {
	if (event === 'Julie.login')
		socket.name = res
	return 'ok'
}
```

If a message _'Julie.login'_ has been processed successfully, the result of the service will be associated to the socket connected.

What a state shift is changing and clients should be notified, the function _identifySockets_ will be called as follows:

```javascript
this.shifted( { mood: 'Pour toi, Claire' }, 'Claire' )
...
identifySockets: async function ( sockets, target ) {
	let filtered = []
	for (let socket of sockets)
		if ( target === '*' || socket.name === target || socket.name === target.name )
			filtered.push( socket )
	return filtered
}
```

The function _identifySockets_ is called by the internal function _broadcast_ performed by thhe user-called function _shifted_. The role of the funtion _identifySockets_ is to filter out the clients to send the messages to. By default all connected websocket clients will be notified.


## Shield

[harcon-radiation](https://github.com/imrefazekas/harcon-radiation) allows you to define a shield function in the config file in order to protect the system against unwanted addressing or reaching restricted area:

```javascript
var harcon = new Harcon( {
	...
	shield: function (division, event) {
		return false
	}
} )
```

Should that function return 'true', the incoming message should be rejected with an error: 'Message has been blocked'


## Nimesis

Nimesis is a built-in entity of [harcon-radiation](https://github.com/imrefazekas/harcon-radiation) providing one single service:

```javascript
mimic: function( entityDef ){
```

It accepts harcon entity definitions as string and converts them to entity definitions then publishes it according its configuration. By default, all services will be exposed through REST and Websockets as well.
Serves well when dynamic extension or ability to publish services on-the-fly is a requirement.
The Nimesis Will hold only 1 definition as reference. When a new definition incomes, the previous one will be destructed.

Calling the function _'reshape'_ will remove the published entity.

Note: this feature is serving special purposes, use it with adequate caution.


## License

(The MIT License)

Copyright (c) 2018 Imre Fazekas

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
