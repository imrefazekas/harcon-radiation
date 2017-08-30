module.exports = {
	newRadiation: (self) => {
		return {
			name: self.options.name || 'Radiation',
			distinguish: self.options.distinguish,
			options: self.options,
			auditor: true,
			context: 'Inflicter',
			division: self.inflicter.division,
			init: function (options) {
				return new Promise( async (resolve, reject) => {
					try {
						if ( self.options.exposeVivid ) {
							await self.dorest( self.inflicter.systemFirestarter, 'vivid' )
							await self.dosocket( self.inflicter.systemFirestarter, 'vivid' )
						}
						resolve('ok')
					} catch (err) { reject(err) }
				} )
			},
			castOf: function ( name, firestarter ) {
				return new Promise( async (resolve, reject) => {
					try {
						if ( !firestarter.object ) return resolve('ok')
						if ( firestarter.object.rest ) {
							self.options.logger.radiationlog( null, 'UnResting', { name: firestarter.name }, self.options.logLevel )
							await self.unrest( name, firestarter )
						}
						if ( firestarter.object.websocket ) {
							self.options.logger.radiationlog( null, 'UnSocketing', { name: firestarter.name }, self.options.logLevel )
							await self.desocket( name, firestarter )
						}
						resolve('ok')
					} catch (err) { reject(err) }
				} )
			},
			entityShifted: function ( component ) {
				return new Promise( async (resolve, reject) => {
					try {
						await self.notifyListeners( 'shifted', [self, component] )
						if ( !self.options.inboundShifts )
							await self.broadcast( component )
						resolve('ok')
					} catch (err) { reject(err) }
				} )
			},
			affiliated: function ( division, context, name ) {
				return new Promise( async (resolve, reject) => {
					try {
						let firestarter = this.inflicter.barrel.firestarter( name )
						if ( firestarter.object ) {
							self.deployedServices.push( {
								division: firestarter.division,
								context: firestarter.context,
								name: firestarter.name,
								services: firestarter.services()
							} )
							if ( firestarter.object.rest ) {
								self.options.logger.radiationlog( null, 'Resting', { name: firestarter.name }, self.options.logLevel )
								await self.dorest( firestarter )
							}
							if ( firestarter.object.websocket ) {
								self.options.logger.radiationlog( null, 'Socketing', { name: firestarter.name }, self.options.logLevel )
								await self.dosocket( firestarter )
							}
							await self._igniteSystemEvent('radiated', firestarter.name, firestarter.division, firestarter.context )
						}
						resolve('ok')
					} catch (err) { reject(err) }
				} )
			},
			close: function ( ) {
				return new Promise( async (resolve, reject) => {
					if ( self.options.rest.closeRest )
						self.restify.shutdown()
					resolve('ok')
				} )
			},
			entityURIs: self.entityURIs,
			inflicter: self.inflicter
		}
	},
	newMimic: (self) => {
		return {
			name: self.options.mimesis.name || 'Mimesis',
			rest: !!self.options.mimesis.rest,
			websocket: !!self.options.mimesis.websocket,
			reshape: async function ( ) {
				if ( self.mimicEntity )
					await self.inflicter.detracts( self.mimicEntity )
				return 'ok'
			},
			mimic: async function ( entityDef, terms, ignite ) {
				if ( self.mimicEntity ) {
					await self.inflicter.detracts( self.mimicEntity )
					self.mimicEntity = null
				}
				self.mimicEntity = await self._readEntity( entityDef )
				return self.mimicEntity.name
			}
		}
	}
}
