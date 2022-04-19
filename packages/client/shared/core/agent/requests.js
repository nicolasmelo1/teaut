import axios from 'axios'
import { API_HOST } from '../../conf'
import { setTokenInHeader, exceptionObserver, getToken } from './utils'

function initializeRequestsCache() {
    const responsesCache = {}

    function createCacheOfResponse(response) {
        return {
            updatedAt: new Date(),
            response
        }
    }

    function saveResponseToCache(url, response) {
        responsesCache[url] = createCacheOfResponse(response)
    }

    function hasCachedResponseOrIsValid(url, cacheInSeconds) {
        const cachedResponse = responsesCache[url]
        const hasCachedResponse = ![undefined, null].includes(cachedResponse)
        if (hasCachedResponse) {
            const now = new Date()
            const differenceFromNowAndLastUpdatedDate = now - cachedResponse.updatedAt
            const isValid = (differenceFromNowAndLastUpdatedDate * 1000) < cacheInSeconds
            return isValid
        }
        return false
    }

    function getResponseCache(url, cacheInSeconds) {
        if (hasCachedResponseOrIsValid(url, cacheInSeconds)) {
            return responsesCache[url].response
        } else {
            return null
        }
    }

    return {
        getResponseCache,
        hasCachedResponseOrIsValid,
        saveResponseToCache
    }
}

const CACHE = initializeRequestsCache()

export const getUrl = (path) => {
    return `${API_HOST}${path}`
}

export const requests = {
    /**
     * This is used to make a request, instead of defining the request directly using axios we will use this function by default.
     * By doing this we are able to cancel the request, remake the request again and all of that stuff.
     */
    request: async (
        url, method, { data=null, headers=null, params=null, source=null, cacheSeconds=null }={}
    ) => {
        const isCacheSecondsDefined = typeof cacheSeconds === 'number'
        const isCacheValid = isCacheSecondsDefined ? 
            CACHE.hasCachedResponseOrIsValid(url, cacheSeconds) :
            false
        
        if (isCacheValid) {
            return CACHE.getResponseCache(url, cacheSeconds)
        } else {
            let isToMakeRequestAgain = false

            function makeRequestAgain() { isToMakeRequestAgain = true }

            if (source === null) {
                const CancelToken = axios.CancelToken
                source = new CancelToken(function (_) {})
            }
            try {
                const token = await getToken()
                const requestOptions = {
                    method: method,
                    url: getUrl(url),
                    cancelToken: source.token,
                    headers: setTokenInHeader(token)
                }
                if (headers !== null) requestOptions.headers = { ...requestOptions.headers, ...headers}
                if (data !== null) requestOptions.data = data
                if (params !== null) requestOptions.params = params
                
                const requestResponse = await axios.request(requestOptions)
                
                if (isCacheSecondsDefined) CACHE.saveResponseToCache(url, requestResponse)

                return requestResponse
            } catch (exception) {
                if (!axios.isCancel(exception)) {
                    await exceptionObserver.fireHandlers(exception.response, makeRequestAgain)
                    if (isToMakeRequestAgain === true) {
                        return requests.request(url, method, { data, headers, params, source })
                    } else {
                        return exception.response
                    }
                }
            }
        }
    },
    /**
     * This will run a DELETE request for deleting an instance of something.
     * 
     * @param {object} reqOptions - The options of the request.
     * @param {string} reqOptions.url - The url that you are wanting to call to delete an instance of something.
     * @param {object} [reqOptions.params={}] - Please send a NON nested object. This is all of the parameters
     * you want to add in the url. It is a query string parameter.
     * @param {object} [reqOptions.headers={}] - Also the same as above, this is the header of the request. The object
     * that is sent, it's better if the keys are strings.
     * @param {axios.CancelToken | null} [reqOptions.source=null] - This is an axios source to cancel the request at 
     * a given time. This is used so for example: when we keep changing page or trying to extensively load the
     * same data over and over again, if the request has not been finished processing, then we will cancel the request.
     * 
     * @returns {import('axios').Response} - An axios response which will contain the data.
     */
    delete: async (url, { params=null, headers={}, source=null, cacheSeconds=null } = {}) => {   
        return await requests.request(url, 'DELETE', { params, headers, source, cacheSeconds })
    },
    /**
     * This will run a GET request for retrieving an instance of something.
     * 
     * @param {object} reqOptions - The options of the request.
     * @param {string} reqOptions.url - The url that you are wanting to call to delete an instance of something.
     * @param {object} [reqOptions.params={}] - Please send a NON nested object. This is all of the parameters
     * you want to add in the url. It is a query string parameter.
     * @param {object} [reqOptions.headers={}] - Also the same as above, this is the header of the request. The object
     * that is sent, it's better if the keys are strings.
     * @param {axios.CancelToken | null} [reqOptions.source=null] - This is an axios source to cancel the request at 
     * a given time. This is used so for example: when we keep changing page or trying to extensively load the
     * same data over and over again, if the request has not been finished processing, then we will cancel the request.
     * 
     * @returns {import('axios').Response} - An axios response which will contain the data.
     */
    get: async (url, { params={}, headers={}, source=null, cacheSeconds=null } = {}) => {
        return await requests.request(url, 'GET', { params, headers, source, cacheSeconds })
    },
    put: async (url, { body={}, headers={}, source=null, params={}, cacheSeconds=null } = {}) => {
        return await requests.request(url, 'PUT', { data: body, headers, source, params, cacheSeconds })
    },
    post: async (url, { body={}, headers={}, source=null, params={}, cacheSeconds=null } = {}) => {
        return await requests.request(url, 'POST', { data: body, headers, source, params, cacheSeconds })
    }
}
