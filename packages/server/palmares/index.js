const http = require('http')
const express = require('express')
const { path: routerPath } = require('./routers')

const websockets = require('./websockets')
const logger = require('./logging')
const database = require('./database')

/**
 * Initialize the app and start the server, this will be responsible for loading all of the routes, the database and also
 * listening at an specific port.
 * 
 * @param {Object} settings - The settings object with many configuration stuff
 * 
 * @returns {Object} - Returns the Express app started.
 */
 function initializeApp(settings) {
    let websocketServer = null
    let routes = require(settings.ROOT_URLCONF)
    const app = express()
    const server = http.createServer(app)

    for (const middleware of settings.MIDDLEWARE) {
        app.use(middleware)
    }

    
    if (settings.WEBSOCKETS) {
        if (settings.WEBSOCKETS.ROOT_URLCONF) {
            const websocketRoutes = require(settings.WEBSOCKETS.ROOT_URLCONF)
            websocketServer = websockets.initialize(server, websocketRoutes)
        } else {
            throw new Error('You should define `ROOT_URLCONF` attribute in WEBSOCKETS setting in your `settings.js`')
        }
    }

    database.initialize(settings)

    const rootRouter = routerPath('', routes).getRouter()
    app.use(rootRouter)
    
    server.listen(settings.PORT, () => {
        logger.INFO.STARTING_APPLICATION(settings.APP_NAME, settings.PORT)
    })
    
    process.on('SIGINT', async () => {
        logger.INFO.STOPPING_APPLICATION(settings.APP_NAME)
        await database.close()
        if (websocketServer) {
            await websocketServer.close()
        }
        process.exit(0)
    })

    return app
}

module.exports = initializeApp