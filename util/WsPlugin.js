const fp = require('fastify-plugin')
const WebSocket = require('ws')

module.exports = {
	addWSServer: function (path, handler) {
		return fp((fastify, opts, next) => {
			const lib = opts.library || 'ws'

			if (lib !== 'ws' && lib !== 'uws') return next(new Error('Invalid "library" option'))

			let wss = new WebSocket.Server( {
				server: fastify.server,
				path: path
			} )

			fastify.decorate('ws', wss)

			wss.broadcast = function broadcast (data) {
				wss.clients.forEach(function each (client) {
					if (client.readyState === WebSocket.OPEN) {
						client.send(data)
					}
				})
			}
			wss.on('connection', (socket) => {
				console.log('Client connected.')

				socket.on('message', (msg) => {
					handler(socket, msg).catch(console.error)
				})
				socket.on('close', () => {})
			})

			fastify.addHook('onClose', (fastify, done) => {
				return fastify.ws.close(done)
			})

			next()
		}, {
			fastify: '1.x',
			name: 'fastify-ws'
		})
	}
}
