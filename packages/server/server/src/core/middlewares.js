const CORS = require('./utils/cors')

/**
 * I could use cors() middleware, but you wouldn't learn something
 * new by doing so.
 * 
 * So instead i'm using a custom middleware that allow us to learn and
 * also have full control over.
 * 
 * To use it just add corsMiddleware() in the MIDDLEWARE list.
 * 
 * @returns {Function} - A function that will be executed in the request
 */
function corsMiddleware() {
    const cors = new CORS()

    return async (req, res, next) => {
        const isPreflight = await cors.handleCors(req, res)
        if (isPreflight === false) {
            next()
        }
    }
}


/**
 * Connverts the query string parameters from snake_case to camelCase so we comply better with 
 * Javascript default style guides.
 * 
 * @returns {Function} - A function that will be executed in the request as a middleware.
 */
function snakeToCamelCaseQueryParams() {
    return async (req, res, next) => {
        // needs to require here because otherwise it will generate circular dependency errors.
        const { snakeCaseToCamelCase } = require('./utils')

        const { query } = req
        const newQuery = {}

        for (let key in query) {
            const newKey = snakeCaseToCamelCase(key)
            newQuery[newKey] = query[key]
        }

        req.query = newQuery
        next()
    }
}

/**
 * This is a dumb middleware that will add the `reflow` as the `X-Powered-By` header.
 * Obviosly this will not add anything to the response but we can feel smart for people
 * that tries to see the headers of the response inside of the browser. We can add messages like
 * if we are hiring and stuff like that, think this as an easter egg.
 * 
 * @returns {Function} - A function that will be executed in the request as a middleware.
 */
function poweredByReflowMiddleware() {
    return async (req, res, next) => {
        res.setHeader('X-Powered-By', "reflow's palmares")
        next()
    }
}

/**
 * Retrieves the current prefered language of the user from the request so we can translate the response and other
 * parts of the backend application.
 */
function retrieveUsersPreferredLanguage() {
    return async (req, res, next) => {
        const acceptedLanguages = req.acceptsLanguages()
        let language = 'default'
        if (acceptedLanguages.length > 0 && acceptedLanguages[0] !== '*') {
            language = acceptedLanguages[0]
        }
        req.preferredLanguage = language
        next()
    }
}

module.exports = {
    corsMiddleware,
    snakeToCamelCaseQueryParams,
    poweredByReflowMiddleware,
    retrieveUsersPreferredLanguage
}