let Clerobee = require('clerobee')
let clerobee = new Clerobee( 32 )

function pick ( object, properties ) {
	let res = {}
	for (let property of properties) {
		res[ property ] = object[ property ]
	}
	return res
}

let getContext = function ( firestarter, prefix ) {
	let reference = prefix.replace('.', '/')
	let division = firestarter.division ? '/' + firestarter.division.replace('.', '/') : ''
	return division + '/' + reference
}

module.exports = {
	extractRequest: function ( request ) {
		let newRequest = pick(request, ['headers', 'url', 'method', 'originalUrl', 'body', 'query', 'params'])
		for (let attribute of this.options.attributesRespected ) {
			newRequest[ attribute ] = request[ attribute ]
		}
		return newRequest
	},
	unrest: function ( name, firestarter ) {
		let self = this
		self.revoke( firestarter, 'REST', async function (firestarter, path) {
			return self.restify.unpost( path.context + path.path )
		})
	},
	dorest: function ( firestarter, serviceInInterest ) {
		let self = this

		return new Promise( async (resolve, reject) => {
			if ( !self.REST )
				return resolve( self.toREST.push( { firestarter: firestarter, serviceInInterest: serviceInInterest } ) )

			try {
				await self.publish( firestarter, 'REST', function (firestarter, prefix, service) {
					if ( serviceInInterest && serviceInInterest !== service ) return null
					if ( self.options.rest.ignoreRESTPattern ) return null

					let path = { path: '/' + service, context: getContext(firestarter, prefix) }
					let security = firestarter.object.security || {}
					security.options = true
					path.protector = security.protector ? security.protector( service ) : null
					self.restify.post( path, async function ( request, content, callback ) {
						let params = content.params || content.parameters || []
						let newRequest = self.extractRequest( request )
						await self.notifyListeners( 'posted', [ self, { request: newRequest, content: content } ] )
						self.ignite( clerobee.generate(), { request: newRequest, content: content }, firestarter.division, prefix + '.' + service, params, (err, res) => {
							if ( self.options.gatekeeper && self.options.gatekeeper[content.division] && self.options.gatekeeper[content.division][content.event] )
								self.options.gatekeeper[content.division][content.event]( err, res, callback )
							else callback(err, res)
						} )
					}, security )
					return path
				} )
				resolve('ok')
			} catch (err) { reject(err) }
		} )
	},
	rester: async function ( rest, options ) {
		let self = this

		return new Promise( async (resolve, reject) => {
			self.restify = rest // rest.create( options || {} )
			self.REST = { }
			self.options.logger.radiationlog( null, 'REST service has been activated.', {}, self.options.logLevel )

			if ( self.options.mimesis ) {
			}

			for ( let reference of self.toREST ) {
				self.options.logger.radiationlog( null, 'Posteriorly executed publishing for REST...', { name: reference.firestarter.name }, self.options.logLevel )
				await self.dorest( reference.firestarter, reference.serviceInInterest )
			}
			self.toREST.length = 0

			if ( rest.config )
				self.options.attributesRespected.forEach( function ( attributeRespected ) {
					if ( !rest.config.attributesRespected.includes(attributeRespected) )
						rest.config.attributesRespected.push(attributeRespected)
				} )

			if ( self.options.rest.harconrpcPath ) {
				self.options.logger.radiationlog( null, 'HarconREST has been activated.', { path: self.options.rest.harconrpcPath }, self.options.logLevel )
				self.restify.post( { path: self.options.rest.harconrpcPath, context: '' }, async function ( request, content, callback ) {
					return new Promise( async (resolve, reject) => {
						let newRequest = self.extractRequest( request )
						await self.notifyListeners( 'posted', [ self, { request: newRequest, content: content } ] )
						try {
							let res = await self.ignite( content.id || clerobee.generate(), { request: newRequest, content: content }, content.division, content.event, content.params )
							if ( self.options.gatekeeper && self.options.gatekeeper[content.division] && self.options.gatekeeper[content.division][content.event] )
								await self.options.gatekeeper[content.division][content.event]( res )
							resolve( res )
						} catch ( err ) { reject(err) }
					} )
				} )
			}

			if ( self.options.rest.jsonrpcPath ) {
				self.options.logger.radiationlog( null, 'JSONRPC on REST has been activated.', { path: self.options.rest.jsonrpcPath }, self.options.logLevel )
				self.restify.post( { path: self.options.rest.jsonrpcPath, context: '' }, async function ( request, content, callback ) {
					return new Promise( async (resolve, reject) => {
						try {
							let res = await self.processJsonRpc( request, content )
							if ( self.options.gatekeeper && self.options.gatekeeper[content.division] && self.options.gatekeeper[content.division][content.event] )
								await self.options.gatekeeper[content.division][content.event]( res )
							resolve( res )
						} catch ( err ) { reject(err) }
					} )
				} )
			}

			resolve( this.restify.processRequest() )
		} )
	}
}
