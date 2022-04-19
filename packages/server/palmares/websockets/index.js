const logger = require('../logging')
const { path: routerPath } = require('../routers')
const { settings } = require('../conf')
const Consumer = require('./consumer')
const { DenyConnection } = require('./errors')

const WebSocket = require('ws')
const pathToRegexp = require('path-to-regexp')
const querystring = require('querystring')

/**
 * Function responsible for initializing the layer to send events to the consumers.
 * 
 * In order for the websocket to be able to be really scalable we need to have a layer in between the websocket
 * and the consumers. You might ask yourself why.
 * 
 * first you might want to read this article: https://blog.logrocket.com/scalable-websockets-with-nestjs-and-redis/
 * 
 * By default the websocket socket connections will have an state. The state will be all of the open connections inside
 * of this application.
 * 
 * The problem is that when we scale the application we might scale horizontally. In simple terms is like we had the application
 * running on port 4001 and another one on port 4000. They do not share state with each other, each of them are running in completly
 * separate environments as well as completly different machines.
 * 
 * So, how can we broadcast one message for all consumers? Simple, use a layer.
 * 
 * A layer is a class that might connect to a separate service outside of the server, like redis for example.
 * 
 * When a user connect to a websocket in a particular group we also add this consumer to a subscriber in redis.
 * This way when we publish a message inside of redis we can send it to all subscribed consumers in all of the servers.
 * 
 * This effectively broadcast the message accross all of the users connected to the websocket doesn't matter how many servers
 * we have up.
 * 
 * I know it's kinda confusing at first, but it's not so difficult when you understang that we can have a state when the application is running
 * and this state is particular for this particular machine/this particular application running.
 * 
 * We will still have a state, except we will broadcast the message across all applications states. Think like that:
 * all applications have a state and they are not able to communicate with each other, through redis we can effectively communicate.
 * 
 * API EXPLANATION:
 * To broadcast a message you will use
 * ```
 * const websockets = require('../../config/websockets')
 * 
 * websockets.layer.publish(`thegroupyouwanttobroadcastyourmessage`, {
 *      hello: 'World'
 * })
 * ```
 * This will broadcast your message to all connected consumers.
 * 
 * By default we use a simple inMemory layer, this IS NOT RECOMMENDED for production since this keeps the state inside of the application
 * this is good when you're developing.
 * 
 * TO SETUP WEBSOCKETS IN THE APPLICATION YOU SHOULD SET IN THE settings.js FILE:
 * ```
 * const WEBSOCKETS = {
 *      ROOT_URLCONF: BASE_PATH + '/src/routing', // obligatory
 *      LAYER: {
 *          BACKEND: 'inMemory', // will always use a layer, if you leave the layer blank or doesn't set.
 *      }
 *      MAX_LISTENERS: 100, // Increases the maximum number of listeners for a single websocket connection can be a problem if you have too much middlewares in a single websocket connection 
 *                         // optional, default is 11
 * }
 * ```
 * 
 * @returns {object} - Returns a object with `.publish`, `.subscribe` and `.unsubscribe` functions. You will generally use
 * `publish` to broadcast a message.
 */
function initializeLayer() {
    let layer = null

    if (settings.WEBSOCKETS?.LAYER?.BACKEND) {
        const layerClass = require(`./layer/${settings.WEBSOCKETS.LAYER.BACKEND}`)
        layer = new layerClass()
    } else {
        const InMemoryLayer = require(`./layer/inMemory`)
        layer = new InMemoryLayer()
    }

    return {
        publish: (channel, message) => {
            initialize()
            layer.publish(channel, message)
        },
        subscribe: (channel, callback) => {
            initialize()
            layer.subscribe(channel, callback)
        },
        unsubscribe: (channel) => {
            initialize()
            layer.unsubscribe(channel)
        }
    }
}

/**
 * The layer state initialized so we can broadcast a message outside of the consumers.
 */
const layer = initializeLayer()

const initialize = (server, routes) => {
    const websocketServer = new WebSocket.Server({
        server: server
    })
    setUpEvents(websocketServer, routes)
    return websocketServer
}

/**
 * Used for handle broadcasting of message to multiple users inside of the groups.
 * 
 * In the scope object we have access to `broadcast` attribute. This attribute will contain both
 * `appendToGroup` and `broadcastToGroup` functions.
 * 
 * When you use inside of your consumer function or middleware
 * > scope.broadcast.appendToGroup('admins', websocket, (message) => { websocket.send('Hello admins') })
 * > scope.broadcast.appendToGroup('users', websocket, (message) => { websocket.send('Hello users') })
 * 
 * This will append to 'admins' the callback, and the second line will append to 'users' the callback.
 * Since groups is defined globaly when initializing the aplication we will have a master object of all of the callback functions of all
 * of the connected users we need to call for each group.
 * 
 * So suppose we have two connections open, and on those two connections we are appending to the group 'admins'. So my groups
 * object will look like:
 * 
 * groups = {
 *      admins: [function, function]
 * }
 * 
 * because we have 2 connections open to the same group.
 * 
 * So now suppose we have 3 connections open on the same group, we will end up having:
 * 
 * groups = {
 *      admins: [function, function, function]
 * }
 * 
 * Okay, so with that to broadcast to every user inside of the group we do:
 * 
 * > scope.broadcast.broadcastToGroup('admins', 'custom message')
 * 
 * This will broadcast for every client connected to the group the 'custom message'.
 * This works like an observer except that you call it explicitly instead of implicit.
 * 
 * TODO: Needs to add a functionality to not store this in memory only, but be able to store it redis for better performance.
 * 
 * @returns {Function} = Initializes the broadcasting feature initializing the groups variable and then returns a new function to be called
 * whenever. The handleBroadcasting is supposed to be called globally and the rest of the functions can be defined after. 
 */
function handleBroadcasting() {
    const groups = new Map()

    return () => {
        /**
         * Append the connections to a certain group so we can broadcast them later.
         * 
         * @param {String} groupName - The name of the group you want to append the connections to.
         * @param {Websocket} websocket - The websocket connection instance.
         * @param {(Consumer | Function)} functionOrConsumerInstance - Either a function or a Consumer class instance.
         */
        function appendToGroup(groupName, websocket, functionOrConsumerInstance) {
            const socketToAppend = { 
                websocket: websocket, 
                functionOrConsumerInstance: functionOrConsumerInstance
            }
            if (groups.has(groupName)) {
                groups.get(groupName).push(socketToAppend)
            } else {
                // subscribe to this channel layer
                layer.subscribe(groupName, (message) => {
                    sendMessageToConnectedSockets(groupName, message)
                })
                groups.set(groupName, [socketToAppend])
            }
        }

        /** 
         * Broadcast a message to every connection inside of a certain group.
         * 
         * @param {String} groupName - The name of the group you want to broadcast to.
         * @param {String} message - The message you want to broadcast.
         */
        function broadcastToGroup(groupName, message) {
            layer.publish(groupName, message)
        }

        function sendMessageToConnectedSockets(groupName, message) {
            if (groups.has(groupName)) {
                let newGroup = []
                for (const {websocket, functionOrConsumerInstance} of groups.get(groupName)) {
                    if (websocket.readyState === WebSocket.OPEN) {
                        if (functionOrConsumerInstance.constructor.prototype instanceof Consumer) {
                            functionOrConsumerInstance.send(message)
                        } else {
                            // if it is a promise or not we will resolve each handler at once. this way we don't mess with the 
                            // handle counter and also we are using middleware to prevent further connections, with this we can prevent the connection
                            functionOrConsumerInstance(message)
                        }
                        newGroup.push({websocket, functionOrConsumerInstance})
                    }
                }
                if (newGroup.length > 0) {
                    groups.set(groupName, newGroup)
                } else {
                    groups.delete(groupName)
                    layer.unsubscribe(groupName)
                }
            }
        }

        return {
            appendToGroup,
            broadcastToGroup
        }
    }
}

/**
 * Set up the connection event on the socket so we can have a simple api for the programmer to use either extending the Consumer class or using
 * simple functions, similar to how a controller work.
 * 
 * @param {WebSocket.Server} websocketServer - The WebSockerServer instance recieved when initializing WebSocket.Server from 'ws' library.
 * @param {Array<RouterPattern>} router - Check `.routers.js` for how this class works and better understanding.
 */
const setUpEvents = (websocketServer, routes) => {
    const rootRouter = routerPath('', routes)
    const broadcaster = handleBroadcasting()
    
    websocketServer.on('connection', (websocket, req) => {
        websocket.setMaxListeners(settings?.WEBSOCKETS?.MAX_LISTENERS ? settings?.WEBSOCKETS?.MAX_LISTENERS : 11)
        let foundMatchingUrl = false
        /**
         * This is a callback used to fire the consumers. A consumer can be either a simple function or extended from the Consumer class.
         * 
         * When you create a consumer extended from the consumer class we will automatically handle many stuff for you so you will not have to worry
         * about defining everything yourself.
         * 
         * When a consumer is defined as a function we can handle either async functions or sync functions. The interface will be a lot similar to 
         * how a controller in express works. We have support for middlewares also giving the next() function to be called at the end of the middleware
         * so you can validate if the user has a token for example and close the connection if you want to.
         * 
         * Example in `routing.js`:
         * ```
         * async function middleware(scope, websocket, next) {
         *      if (isValid(scope.headers.token)) {
         *          console.log('has a valid token')
         *          scope.user = await User.instance.findOne({where: {id: userId}})
         *          next()
         *      } else {
         *          websocket.close()
         *      }
         * }
         * 
         * function consumer (scope, websocket, next) {
         *      websocket.on('message', function (message) {
         *           console.log(`recieved from the user ${scope.user} the following message: ${message}`)
         *      })
         * }
         * 
         * path('/websockets', [
         *      path('/:teste(nicolas|lucas)', middleware, consumer)
         * ])
         * ```
         * 
         * On this example what we do is: we validate when the user is connection if he can connect, can be by the token headers, by variables
         * and so on. Then after validating, we close the connection if the token is not valid or call `next()` if the token is valid. We also
         * add the user key to the scope so the next function can access the user in the scope.
         * 
         * We can also create Consumer as classes like so:
         * Example in `routing.js`:
         * ```
         * class MiddlewareConsumer extends Consumer {
         *      async connect (scope, next) {
         *          if (isValid(scope.headers.token)) {
         *              console.log('has a valid token')
         *              scope.user = await User.instance.findOne({where: {id: userId}})
         *              super.connect(scope, next)
         *          } else {
         *              this.websocket.close()
         *          }
         *      }
         * }
         * 
         * class CustomConsumer extends Consumer {
         *      connect(scope, next) {
         *          this.user = scope.user
         *      }
         * 
         *      recieve(message) {
         *           console.log(`recieved from the user ${this.user} the following message: ${message}`)
         *      })
         * }
         * 
         * path('/websockets', [
         *      path('/:teste(nicolas|lucas)', MiddlewareConsumer, CustomConsumer)
         * ])
         * ```
         */
        function fireConsumers(scope, handlers, options) {
            if (foundMatchingUrl === false) {
                foundMatchingUrl = true
                logger.INFO.WEBSOCKET_CONNECTED(req.url)
                scope.headers = req.headers
                scope.broadcast = {
                    ...broadcaster()
                }
                scope.server = websocketServer
                scope.options = options

                let counter = 0
                async function next() {
                    try {
                        const handler = handlers[counter]
                        if (counter < handlers.length && ![WebSocket.CLOSED, WebSocket.CLOSING].includes(websocket.readyState)) {
                            counter++
                            if (handler.prototype instanceof Consumer) {
                                const consumerInstance = new handler(websocket)
                                const response = consumerInstance.connect(scope, next)
                                if (response instanceof Promise) await response
                            } else {
                                // if it is a promise or not we will resolve each handler at once. this way we don't mess with the 
                                // handle counter and also we are using middleware to prevent further connections, with this we can prevent the connection
                                const response = handler(scope, websocket, next)
                                if (response instanceof Promise) await response
                            }
                        }
                    } catch (error) {
                        if (error instanceof DenyConnection) {
                            console.log(error.message)
                            logger.WARN.CANNOT_CONNECT_TO_WEBSOCKET(req.url)
                            websocket.close()
                            websocket.terminate()
                        } else {
                            throw (error)
                        }
                    }
                }
                next()
            } else {
                throw new Error('Trying to fire two consumers at once.')
            }
        }

        validatePathAndCallCallback(rootRouter, req.url, fireConsumers)
        if (foundMatchingUrl === false) {
            logger.WARN.CANNOT_CONNECT_TO_WEBSOCKET(req.url)
            websocket.close()
            websocket.terminate()
        }
    })
}

/**
 * This is more of a router functionality but since this is only used in websockets and not when we recieve a request we add it here.
 * 
 * The idea is that this will append all of the routes defined and see if any route match the route given. This way we can have matching 
 * routes for the websocket.
 * 
 * We can have a connection in /websockets/teste and another in /websockets/user/:userId and only them will accept the connections. All the others
 * will not accept the connection.
 * 
 * This is similar on how express handle routes, actually we use exactly most the same logic.
 * 
 * THis function is recursive which can be kinda intimidating at first.
 * 
 * TODO: We can make it more performant making a return to stop the loops so we don't need to match all the patterns everytime.
 * 
 * @param {RouterPattern} routerPattern - The RouterPattern object defined in router.js file.
 * @param {String} path - The actual path recieved from the client.
 * @param {Function} callback - A function to be called once we match a url.
 * @param {String} combinedPath - The path urls combined so we can match the exact url.
 */
const validatePathAndCallCallback = async (routerPattern, path, callback, combinedPath='', combinedOptions={}) => {
    const routerPath = routerPattern.path === '/' ? '' : routerPattern.path
    combinedPath = combinedPath + routerPath
    const areAllFunctionsOrObjects = routerPattern.handlers.every(handler=> typeof handler === 'function' || (!Array.isArray(handler) && typeof handler === 'object'))
    const functions = routerPattern.handlers.filter(handler=> typeof handler === 'function')
    const arrayOfPaths = routerPattern.handlers.filter(handler=> Array.isArray(handler))
    const pathOptions = routerPattern.handlers.filter(handler=> typeof handler !== 'function' && !Array.isArray(handler) && typeof handler === 'object')

    // combine all of the options in a single big option, differently than the controllers, although we have middlewares we do not
    // check each path individually so we need this.
    pathOptions.forEach(option => {
        combinedOptions = {...combinedOptions, ...option}
    })
    // if all of the routers are functions we've reached the leaf, after reaching the leaf we validate to see if the path actually
    // matches the combinedPaths, combined paths is like
    // path('/websockets', [
    //         path('/:teste(nicolas|lucas)', middleware, consumer)
    // ])
    // 
    // '/websockets/:teste(nicolas|lucas)' then we convert this to a regex using pathToRegex (the same lib that express uses)
    // and extract the variables and query strings. And then call the callback.
    if (areAllFunctionsOrObjects) {
        let keys = []
        const urlWithoutQueryParams = path.split('?')
        const regexp = pathToRegexp(combinedPath, keys)
        
        if (regexp.test(urlWithoutQueryParams[0])) {
            const pathname = urlWithoutQueryParams[0]
            const match = regexp.exec(urlWithoutQueryParams[0])
            let params = {}
            let query = {}
            urlWithoutQueryParams.shift()
            const queryParameters = urlWithoutQueryParams.join('?')
            
            for (let i =1; i< match.length; i++) {
                const key = keys[i-1]
                params[key.name] = decodeURIComponent(match[i])
            }

            if (queryParameters !== '') {
                query = JSON.parse(JSON.stringify(querystring.parse(queryParameters)))
            }

            const scope = {
                pathname: pathname,
                queryParams: queryParameters,
                path: path,
                query: query,
                params: params
            }
            callback(scope, functions, combinedOptions)
        }
    } else if (routerPattern.handlers.length === functions.length + arrayOfPaths.length + pathOptions.length) {
        for (const arrayOfPath of arrayOfPaths) {
            for (const handler of arrayOfPath) {
                if (functions.length > 0) {
                    handler.handlers = [
                        ...routerPattern.boundControllersToTransactions(functions),
                        ...handler.handlers
                    ]
                }
                await validatePathAndCallCallback(handler, path, callback, combinedPath, combinedOptions)
            }
        }
    }
}


module.exports = {
    initialize,
    DenyConnection,
    Consumer,
    layer,
}
