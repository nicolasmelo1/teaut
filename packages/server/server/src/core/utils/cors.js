
/**
 * Man, i know expressjs has its own CORS lib but anyway, check this out:
 * https://github.com/expressjs/cors/blob/c49ca10e92ac07f98a3b06783d3e6ba0ea5b70c7/lib/index.js#L144
 * 
 * It's one file and it's not even that long. I was handling cors without libs in django before and here i wanted to follow the same thing.
 * 
 * You can configure it the way that you want, it actually does not offer much configuration at the current time but anyway it is really easy to setup
 * and use.
 */
class CORS {
    OPTIONS_METHOD = 'OPTIONS'
    ACCESS_CONTROL_ALLOW_ORIGIN = "Access-Control-Allow-Origin"
    ACCESS_CONTROL_ALLOW_METHODS = "Access-Control-Allow-Methods"
    ACCESS_CONTROL_ALLOW_HEADERS = "Access-Control-Allow-Headers"
    ACCESS_CONTROL_MAX_AGE = "Access-Control-Max-Age"
    ACCESS_CONTROL_ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials"

    DEFAULT_CORS_PREFLIGHT_MAX_AGE = 86400
    DEFAULT_ACCEPTED_HEADERS = ["accept","accept-encoding","authorization","content-type","dnt","origin","user-agent","x-csrftoken","x-requested-with"]
    DEFAULT_ACCEPTED_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

    /**
     * The stuff starts mostly here if you see. With CORS the browser AUTOMATICALLY sends an OPTION request
     * to the server to see all of the cors configuration from the server.
     * 
     * @param {Request} request - the request recieved from express.
     * 
     * @returns {Promise<boolean>} - true if it is a preflight request or false if not.
     */
    async isPreflight(request) {
        if (request.method && request.method == this.OPTIONS_METHOD) {
            return true
        } else {
            return false
        }
    }

    /**
     * When the request is the preflight option request, what we do is send an empty response wthout the actual data so
     * it's faster to send the response.
     * 
     * @param {Request} request - the request recieved from express.
     * @param {Response} response - The response object recieved from express.
     */
    async handlePreflight(request, response) {
        response.setHeader('Content-Length', '0')
        response.setHeader(this.ACCESS_CONTROL_MAX_AGE, this.DEFAULT_CORS_PREFLIGHT_MAX_AGE)
        response.setHeader(this.ACCESS_CONTROL_ALLOW_METHODS, this.DEFAULT_ACCEPTED_METHODS.join(', '))
        response.setHeader(this.ACCESS_CONTROL_ALLOW_HEADERS, this.DEFAULT_ACCEPTED_HEADERS.join(', '))
        response.setHeader(this.ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true')
        await this.addAllowOriginToResponse(request, response)
        response.end()
    }

    async addAllowOriginToResponse(request, response) {
        const origin = request.get('origin')
        if (origin) {
            response.setHeader(this.ACCESS_CONTROL_ALLOW_ORIGIN, origin)
        }
    }

    /**
     * This is the main function that handles the actual cors configuration.
     * It will recieve the request and the response and do whatever it needs to do
     * in order to handle the cors configuration.
     * 
     * By default cors sends us a preflight request to check if the browser is allowed to 
     * send the actual request. This preflight is an OPTION request that is sent by the browser.
     * 
     * If it is a preflight we just send an empty response to the user. Otherwise we will send the 
     * actual response that the user wants.
     * 
     * @param {import('express').Request} request - the request recieved from express.
     * @param {import('express').Response} response - The response object recieved from express.
     * 
     * @returns {Promise<boolean>} - true if it is a preflight request or false if not.
     */
    async handleCors(request, response){
        const isPreflight = await this.isPreflight(request)
        if (isPreflight){
            await this.handlePreflight(request, response)
        } else {
            await this.addAllowOriginToResponse(request, response)
        }
        return isPreflight
    }
}

module.exports = CORS