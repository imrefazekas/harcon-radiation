let Server = require('./Server')

let server = new Server( { } )

server.init( {
} ).then( () => {
	console.log('Operating...')
} )
