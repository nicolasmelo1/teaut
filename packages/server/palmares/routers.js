const { Router } = require('express')

const { settings } = require('./conf')
const logger = require('./logging')
const { getEngineInstance } = require('./database')
const status = require('./status')
const { performance } = require('perf_hooks')


class InvalidRouterError extends Error {}


/**
 * Options are a custom middleware that adds custom options you define in your path to the requests
 * This enables to add stuff like
 * ```
 * path('/users', UserController.asController(), {isAdminRouteOnly: true})
 * ```
 * 
 * Then in your controller you can retrieve those options by doing:
 * ```
 * const getUserProfile = (req, res, next) => {
 *      const { isAdminRouteOnly } = req.options
 * }
 * ```
 * @param {Object} options - This will be the options you pass to the path, you can add 
 * as many options as you want. The options will be appended for all paths below that.
 * 
 * @returns {Function} - The middleware
 */
const optionsMiddleware = (options) => {
    let newOptions = {}
    options.forEach(option => {
        newOptions = { ...newOptions, ...option }
    })
    return async (req, res, next) => {
        if (req.options) {
            req.options = {...req.options, ...newOptions}
        } else {
            req.options = newOptions
        }
        next()
    }
}

/**
 * Provides a simple debugging message in the front-end with the logging of the
 * error. 
 * 
 * It's just so the request doesn't stale: https://stackoverflow.com/questions/51391080/handling-errors-in-express-async-middleware
 * Express by default cannot handle async errors, so since we are bounding each controller/middleware on a transaction.
 * We can safely debug it using this.
 * 
 * @param {Express.Response} res - The response object of express
 * @param {Error} error - The error recieved from the `catch` function
 */
const debugging = (res, error) => {
    if(res.headersSent === false) { 
        if (settings.DEBUG === true) {
            res.status(status.HTTP_500_INTERNAL_SERVER_ERROR).send(error.stack)
        } else {
            res.status(status.HTTP_500_INTERNAL_SERVER_ERROR).send()
        }
    }
    throw(error)
}


class RouterPattern {
    constructor(path, ...handlers) {
        this.path = path
        this.handlers = handlers
    }
    
    /** 
     * THis bounds every request to a transaction so you can use the transaction from the engine you are using
     * directly in your controllers
     * 
     * By default your controllers will recieve, `req`, `res` and `next` this adds the `transaction` argument
     * 
     * function listOptions(req, res, next) {
     *      // do something in your controller
     * }
     * 
     * You will rewrite the above as
     * function listOptions(req, res, next, transaction) {
     *      // now you can use the engine transaction in your views, to use in other functions you just need to pass it around
     * }
     */
    boundControllersToTransactions(functions) {
        let newFunctions = []
        for (const handler of functions) {
            async function transactionHandler(...args) {
                const callback = async (...callbackArgs) => {
                    try {
                        const result = handler(...callbackArgs)
                        if (result instanceof Promise) return await result
                        else return result
                    } catch (e) {
                        const res = callbackArgs[1]
                        debugging(res, e)
                    }
                }
                await getEngineInstance().transaction(callback, ...args)
            }
            newFunctions.push(transactionHandler.bind(handler))
        }
        return newFunctions
    }

    loggingMiddleware(request, response, next) {
        const startTime = performance.now()

        logger.INFO.REQUEST(request.protocol, request.method, request.originalUrl)

        response.on('finish', function() {
            const endTime = performance.now()
            const timeTaken = endTime - startTime
            logger.INFO.RESPONSE(request.protocol, request.method, request.originalUrl, timeTaken)
        })
        next()
    }

    getRouter(functions=[]) {
        this.handlers = [...functions, ...this.handlers]
        // as documented here: https://stackoverflow.com/a/25305272
        const router = new Router({mergeParams: true})
        const areAllFunctionsOrObjects = this.handlers.every(handler=> typeof handler === 'function' || (!Array.isArray(handler) && typeof handler === 'object'))
        const middlewares = this.handlers.filter(handler=> typeof handler === 'function')
        const arrayOfPaths = this.handlers.filter(handler=> Array.isArray(handler))
        const pathOptions = this.handlers.filter(handler=> typeof handler !== 'function' && !Array.isArray(handler) && typeof handler === 'object')
        
        if (pathOptions.length > 0) router.use(optionsMiddleware(pathOptions))
        if (areAllFunctionsOrObjects) {
            router.all(this.path, this.loggingMiddleware,...this.boundControllersToTransactions(this.handlers))
        } else if (this.handlers.length === middlewares.length + arrayOfPaths.length + pathOptions.length) {
            for (const arrayOfPath of arrayOfPaths) {
                for (const handler of arrayOfPath) {
                    router.use(this.path, handler.getRouter(middlewares))
                }
            }
        } else {
            throw new InvalidRouterError('You can either pass n number of functions or an array as the arguments of the `path` function. '+
                                         'You can also combine both if you want to attach middlewares to your children. Examples: \n' +
                                         '> path("/company", (req, res, next) => {\n'+
                                         '  res.json({ hello: "world"}) \n' +   
                                         '})\n\nor: \n' + 
                                         '> path("/company", [\n' +
                                         '      path("/:id", (req, res, next) => {\n'+
                                         '          res.json({ hello: "world"}) \n' +   
                                         '      })\n' + 
                                         '])\n\nor: \n' + 
                                         '> path("/company", \n' +
                                         '      (req, res, next) => {\n' +
                                         '          console.log("middleware that will be called for all children routes")\n' +
                                         '          next()\n' +
                                         '      }, [\n' +
                                         '          path("/:id", (req, res, next) => {\n'+
                                         '              res.json({ companyId: req.params.id}) \n' +   
                                         '          })\n' + 
                                         '      ]\n' +
                                         ')\n\nor: \n' +
                                         '> path("/company", \n' +
                                         '      (req, res, next) => {\n' +
                                         '          console.log("middleware that will be called for all children routes")\n' +
                                         '          next()\n' +
                                         '      }, \n'+
                                         '      (req, res, next) => {\n' +
                                         '          console.log("Another middleware that will be called for all children routes")\n' +
                                         '          next()\n' +
                                         '      }, [\n' +
                                         '          path("/:id", (req, res, next) => {\n'+
                                         '              res.json({ companyId: req.params.id}) \n' +   
                                         '          })\n' + 
                                         '      ]\n' +
                                         ')\n\nor: \n'                                           
                                        )
        }
        return router
    }
}

/**
 * Why is this used and not the default Routers you might ask, for composition purposes, with this you send the path
 * and the handlers, but the handlers can be either a function or an array.
 * 
 * So this is accepted
 * ```
 * path('/users', [
 *      path('/list', UserListController.asController()),
 *      path('/detail', UserDetailController.asController())
 * ])
 * ```
 * 
 * You can also send specific data in your path that you can retrieve by making `req.options`. Like so:
 * ```
 * path('/users', [
 *      path('/list', UserListController.asController(), {foo:'bar'}),
 *      path('/detail', UserDetailController.asController())
 * ], {adminOnlyUrl: true})
 * ```
 * 
 * Then in you UserListController handlers you can access the data you passed like:
 * ```
 * req.options.foo // => 'bar'
 * req.options.adminOnlyUrl // => true
 * ```
 * On the UserDetailController you will only be able to access ```req.options.adminOnlyUrl```
 * 
 * This is useful to define a route that can be accessed by only by admins. And custom middleware.
 * 
 * This will create /users/list and the /users/detail url. This is SO MUCH EASIER than 
 * using the default routes directly. Also it is important to understand that here this matches
 * to all of the HTTP Methods and not especifically, so your same controller will handle either 
 * a POST, or a GET or a PUT request, and you need to make sure you separate them accordingly in
 * your controller.
 */
const path = (path, ...handlers) => {
    const router = new RouterPattern(path, ...handlers)
    return router
}

module.exports = {
    path
}