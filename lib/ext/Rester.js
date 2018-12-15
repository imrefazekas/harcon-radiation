let Clerobee = require('clerobee')
let clerobee = new Clerobee( 32 )

let _ = require('isa.js')

function pick ( object, properties ) {
	let res = {}
	for (let property of properties) {
		res[ property ] = object[ property ]
	}
	return res
}

module.exports = {
	extractRequest: function ( request ) {
		let newRequest = pick(request, ['headers', 'body', 'query', 'params'])
		newRequest.remoteAddress = request.raw.ip
		newRequest.hostname = request.raw.hostname
		newRequest.url = request.raw.url

		for (let attribute of this.options.attributesRespected ) {
			newRequest[ attribute ] = request[ attribute ]
		}
		return newRequest
	},
	unrest: async function ( name, firestarter ) {
		let self = this
		return self.revoke( firestarter, 'REST', async function (firestarter, prefix, service) {
			let path = '/' + firestarter.division + '/' + prefix + '/' + service
			let index = self.REST.indexOf( path )
			if (index > -1)
				self.REST.splice(index, 1)
		} )
	},
	dorest: async function ( firestarter, serviceInInterest ) {
		let self = this

		if ( !self.REST )
			return self.toREST.push( { firestarter: firestarter, serviceInInterest: serviceInInterest } )

		await self.publish( firestarter, 'REST', function (firestarter, prefix, service) {
			let path = '/' + firestarter.division + '/' + prefix + '/' + service
			if ( !self.REST.includes(path) )
				self.REST.push( path )
		} )
		return 'ok'
	},
	rester: async function ( fastify ) {
		let self = this

		self.fastify = fastify // rest.create( options || {} )
		self.REST = []
		self.options.logger.radiationlog( null, 'REST service has been activated.', {}, self.options.logLevel )

		if ( self.options.mimesis ) {
		}

		for ( let reference of self.toREST ) {
			self.options.logger.radiationlog( null, 'Posteriorly executed publishing for REST...', { name: reference.firestarter.name }, self.options.logLevel )
			await self.dorest( reference.firestarter, reference.serviceInInterest )
		}
		self.toREST.length = 0

		if ( !self.options.rest.ignoreRESTPattern ) {
			self.fastify.post( '/:division/:entity/:event', async function (request, reply) {
				if ( !self.REST.includes( request.raw.originalUrl ) )
					throw new Error('Unknown path to call' )

				let newRequest = self.extractRequest( request )
				let content = request.body

				let division = request.params.division
				let event = request.params.entity + '.' + request.params.event
				// await self.notifyListeners( 'posted', [ self, { clientRequest: newRequest, content: content } ] )
				let res = await self.request( clerobee.generate(), { clientRequest: newRequest, content: content }, division, event, Array.isArray( content ) ? content : content.params )
				if ( self.options.gatekeeper && self.options.gatekeeper[ division ] && self.options.gatekeeper[ division ][ event ] )
					await self.options.gatekeeper[ division ][ event ]( res )
				return res
			} )
		}

		if ( self.options.rest.harconrpcPath ) {
			self.options.logger.radiationlog( null, 'HarconREST has been activated.', { path: self.options.rest.harconrpcPath }, self.options.logLevel )
			self.fastify.post( self.options.rest.harconrpcPath, async function (request, reply) {
				let newRequest = self.extractRequest( request )
				let content = request.body

				if (!content || !content.division || !content.event)
					throw new Error('Invalid request')

				// await self.notifyListeners( 'posted', [ self, { clientRequest: newRequest, content: content } ] )
				let res = await self.request( content.id || clerobee.generate(), { clientRequest: newRequest, content: content }, content.division, content.event, content.params )
				if ( self.options.gatekeeper && self.options.gatekeeper[content.division] && self.options.gatekeeper[content.division][content.event] )
					await self.options.gatekeeper[content.division][content.event]( res )
				return res
			} )
		}

		if ( self.options.rest.jsonrpcPath ) {
			self.options.logger.radiationlog( null, 'JSONRPC has been activated.', { path: self.options.rest.jsonrpcPath }, self.options.logLevel )
			self.fastify.post( self.options.rest.jsonrpcPath, async function ( request, reply ) {
				let newRequest = self.extractRequest( request )
				let content = request.body

				if (!content || !content.id || !content.division || !content.method)
					throw new Error('Invalid request')

				// await self.notifyListeners( 'posted', [ self, { clientRequest: newRequest, content: content } ] )
				let id = content.id
				let res = await self.request( id, { clientRequest: newRequest, content: content }, content.division, content.method, content.params )
				if ( self.options.gatekeeper && self.options.gatekeeper[content.division] && self.options.gatekeeper[content.division][content.method] )
					await self.options.gatekeeper[content.division][content.method]( res )
				return self.createJSONAnswer( id, res )
			} )
		}

		return 'ok'
	}
}
