module.exports = {
	newRadiation: (self) => {
		return {
			name: self.options.name || 'Radiation',
			systemEntity: true,
			distinguish: self.options.distinguish,
			options: self.options,
			auditor: true,
			context: 'Inflicter',
			division: self.inflicter.division,
			init: async function (options) {
				if ( self.options.exposeVivid ) {
					await self.dorest( self.inflicter.systemFirestarter, 'vivid' )
					await self.dosocket( self.inflicter.systemFirestarter, 'vivid' )
				}
				return 'ok'
			},
			castOf: async function ( name, firestarter ) {
				try {
					if ( !firestarter.object ) return 'ok'

					if ( firestarter.object.rest && self.REST ) {
						self.options.logger.radiationlog( null, 'UnResting', { name: firestarter.name }, self.options.logLevel )
						await self.unrest( name, firestarter )
					}
					if ( firestarter.object.websocket && self.Websocket ) {
						self.options.logger.radiationlog( null, 'UnSocketing', { name: firestarter.name }, self.options.logLevel )
						await self.desocket( name, firestarter )
					}
					return 'ok'
				} catch (err) { self.options.logger.radiationlog(err) }
			},
			entityShifted: async function ( component ) {
				// await self.notifyListeners( 'shifted', [self, component] )
				if ( !self.options.inboundShifts )
					await self.broadcast( component )
				return 'ok'
			},
			affiliated: async function ( division, context, name ) {
				let firestarter = this.inflicter.barrel.firestarter( name )
				if ( !firestarter.systemEntity && firestarter.object ) {
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
				return 'ok'
			},
			close: async function ( ) {
				if ( self.options.rest.closeRest )
					self.restify.shutdown()
				return 'ok'
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
					await self.inflicter.conclude( self.mimicEntity )
				return 'ok'
			},
			mimic: async function ( entityDef, terms ) {
				if ( self.mimicEntity ) {
					await self.inflicter.conclude( self.mimicEntity )
					self.mimicEntity = null
				}
				self.mimicEntity = await self._readEntity( entityDef )
				return self.mimicEntity.name
			}
		}
	}
}
