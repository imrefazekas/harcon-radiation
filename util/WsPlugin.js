const Assigner = require('assign.js')
let assigner = new Assigner()

const fp = require('fastify-plugin')
const WebSocket = require('ws')

const url = require('url')

module.exports = {
	addWSServer: function (paths, wsOptions = {}) {
		return fp((fastify, opts, next) => {
			const lib = opts.library || 'ws'

			if (lib !== 'ws' && lib !== 'uws') return next(new Error('Invalid "library" option'))

			let wssServers = []
			for (let path in paths)
				wssServers[path] = new WebSocket.Server( assigner.assign( {}, wsOptions, {
					noServer: true
				}) )

			fastify.server.on('upgrade', (request, socket, head) => {
				const pathname = url.parse(request.url).pathname

				if ( wssServers[pathname] ) {
					wssServers[pathname].handleUpgrade(request, socket, head, (ws) => {
						wssServers[pathname].emit('connection', ws)
					})
				} else {
					socket.destroy()
				}
			})

			fastify.decorate('ws', {
				broadcast: async function broadcast (data, identifySockets, target) {
					for (let path in wssServers)
						await wssServers[ path ].broadcast( data, identifySockets, target )
				}
			})

			for (let path in wssServers) {
				let wss = wssServers[ path ]
				wss.broadcast = async function broadcast (data, identifySockets, target) {
					let sockets = await identifySockets( wss.clients, target )
					sockets.forEach(function each (client) {
						if (client.readyState === WebSocket.OPEN) {
							client.send(data)
						}
					})
				}

				wss.on('connection', (socket) => {
					console.log('Client connected.')

					socket.on('message', (msg) => {
						paths[path](socket, msg).catch(console.error)
					})
					socket.on('close', () => {})
				})

				fastify.addHook('onClose', (fastify, done) => {
					return wss.close(done)
				})
			}

			next()
		}, {
			fastify: '>=2.x',
			name: 'fastify-ws'
		})
	}
}
