const path = require('path')

let Assigner = require('assign.js')
let assigner = new Assigner()

module.exports = {
	newConfig: function (config = {}) {
		if (!config.fastify) config.fastify = {}

		let appName = process.env.NODE_APP_NAME || config.name || config.appName || 'Harcon'
		let cfg = {
			name: appName,
			subDivision: process.env.NODE_ENTITY_NAME || config.subDivision,
			millieu: config.millieu || { },

			server: {
				printRoutes: false,
				port: process.env.NODE_SERVER_PORT || 8080,
				ip: process.env.NODE_SERVER_IP || '0.0.0.0',
				active: true,
				rest: true,
				ws: true,
				radiation: true,
				close: async function () { },
				forcefulShutdown: -1
			},
			fastify: {
				maxParamLength: 100,
				bodyLimit: 1048576,
				caseSensitive: true,
				defaultPlugins: function (fastify) {
					fastify.register(require('fastify-healthcheck'))
					fastify.register(
						require('fastify-compress'), config.fastify.compress || { threshold: 2048 }
					)
					fastify.register(
						require('fastify-helmet'), config.fastify.helmet
					)
					if (config.fastify.jwt)
						fastify.register(require('fastify-jwt'), config.fastify.jwt )
					if (config.fastify.static)
						fastify.register(require('fastify-static'), config.fastify.static || {
							root: path.join( process.cwd(), 'dist'),
							prefix: '/public/'
						})
				},
				plugins: function (fastify) {
				},
				routes: function (fastify) {
				}
			},
			harcon: {
				name: appName,
				idLength: process.env.ID_LENGTH || config.idLength || 32,
				bender: {
					enabled: false
				},
				igniteLevel: 'info',
				unfoldAnswer: true,
				blower: {
					commTimeout: 2000,
					tolerates: [ ]
				},
				mortar: {
					enabled: true,
					folder: path.join( process.cwd(), 'bus'),
					liveReload: false,
					liveReloadTimeout: 5000
				},
				connectedDivisions: [ ],
				FireBender: {
					defs: { }
				},
				close: async function () { console.log('Harcon closed.') }
			},
			radiation: {
				name: 'Radiation',
				rest: {
					ignoreRESTPattern: true,
					harconrpcPath: '/' + appName,
					jsonrpcPath: ''
				},
				websocket: {
					harconPath: '/' + appName
				}
			}
		}
		return cfg
	}
}
