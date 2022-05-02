const axios = require('axios')
const { strings } = require('../../../constants')

const { retrieveRepresentation } = require('../../helpers/library')
const errorTypes = require('../errorTypes')
const { FlowObject } = require('../objects')

const { 
    LibraryModule, 
    LibraryStruct
 } = require('./index')


class HTTPResponse extends LibraryStruct {
    __moduleName = 'HTTP'

    async _initialize_(response) {
        this.__attributes = {
            status_code: response.status,
            content: typeof response.data !== 'string' ? JSON.stringify(response.data) : response.data,
            json: typeof response.data !== 'object' ? {} : response.data
        }
        return await super._initialize_()
    }
}


class HTTP extends LibraryModule {
    async newHTTPResponse(response) {
        return await HTTPResponse.new(this.settings, 'HTTPResponse', response)
    }

    /**
     * Responsible for defining the headers in the HTTP request. By default we set the User-Agent to 'Flow' and the 
     * headers to X-Powered-By: "Reflow's Flow". Just a simple way to market our product and language.
     * 
     * @param {Object} payload - The requests payload object with all of the objects to send to axios.
     * @param {Object} headers - The header of the request.
     * 
     * @returns {Object} The payload object with the headers added.
     */
    async defineHeaders(payload, headers) {
        if (typeof headers !== 'object') {
            headers = {}
        }
        if (!Object.keys(headers).includes('User-Agent')) {
            headers['User-Agent'] = 'Flow'
        }
        headers['X-Powered-By'] = "Reflow's Flow"
        
        return {
            ...payload,
            headers:headers
        }
    }

    /**
     * If data and jsonData are both set and not empty objects we will send the data to the backend. It's important to understand
     * that data will send the FormData object and jsonData will send the JSON object.
     * 
     * This means that data is for multipart/form-data and jsonData is for application/json.
     * 
     * @param {Object} payload - The payload object to send in the axios.request function.
     * @param {Object} data - The data object to send in the axios.request function. This will send the data multipart/form-data.
     * @param {Object} jsonData - The jsonData object to send in the axios.request function. This will send the data application/json.
     * 
     * @returns {Object} The payload object with the data or jsonData added.
     */
    async defineData(payload, data={}, jsonData={}) {
        const isJsonAndDataObjects = typeof data === 'object' && typeof jsonData === 'object'
        // we define the content-type header above the split because if it was already defined in the headers it will override
        // our default configuration.
        if (isJsonAndDataObjects && (Object.keys(data).length > 0 || Object.keys(jsonData).length > 0)) {
            if (Object.keys(data).length > 0) {
                // Reference: https://stackoverflow.com/questions/63576988/how-to-use-formdata-in-node-js-without-browser
                let formData = null
                if (FormData !== undefined) formData = new FormData()
                else formData = new URLSearchParams()
                
                for (const key in data) {
                    formData.append(key, data[key])
                }
                return {
                    ...payload,
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                        ...payload.headers,
                    },
                    data: formData
                }
            } else {
                return {
                    ...payload,
                    headers: {
                        'Content-Type': `application/json`,
                        ...payload.headers
                    },
                    data: jsonData
                }
            }
        } 
        return payload
    }

    /**
     * Defines the querysring parameters to be sent in the request if it has any.
     * 
     * @param {Object} payload - The payload object to send in the axios.request function.
     * @param {Object} params - The params object to send in the axios.request function. As querystring parameters.
     * 
     * @returns {Object} The payload object with the params added or the payload object.
     */
    async defineParams(payload, params) {
        if (typeof params === 'object' && Object.keys(params).length > 0) {
            return {
                ...payload,
                params: params
            }
        } else {
            return payload
        }
    }

    /**
     * Defines the basic authentication token in the request if it has any. This will make the request authenticated.
     * 
     * @param {Object} payload - The payload object to send in the axios.request function.
     * @param {[string, string]} basicAuth - The auth object to send in the axios.request function.
     * 
     * @returns {Object} The payload object with the auth added or the payload object.
     */
    async defineBasicAuth(payload, basicAuth=[]) {
        if (Array.isArray(basicAuth) && basicAuth.length === 2) {
            return {
                ...payload,
                auth: {
                    username: basicAuth[0],
                    password: basicAuth[1]
                }
            }
        } else {
            return payload
        }
    }

    methods = {
        get: async ({url, parameters={}, headers={}, basicAuth={}} = {}) => {
            return await this.methods.request({method: 'GET', url, parameters, headers, basicAuth})
        }, 
        post: async({url, data={}, jsonData={}, headers={}, basicAuth=[]} = {}) => {
            return await this.methods.request({method: 'POST', url, data, jsonData, headers, basicAuth})
        },
        put: async({url, data={}, jsonData={}, headers={}, basicAuth=[]} = {}) => {
            return await this.methods.request({method: 'PUT', url, data, jsonData, headers, basicAuth})
        },
        delete: async({url, parameters={}, headers={}, basicAuth=[]} = {}) => {
            return await this.methods.request({method: 'DELETE', url, parameters, headers, basicAuth})
        },
        request: async({method, url, parameters={}, data={}, jsonData={}, headers={}, basicAuth=[]} = {}) => {
            if (data instanceof FlowObject) data = await data._json_()
            else data = await retrieveRepresentation(data) 
            if (jsonData instanceof FlowObject) jsonData = await jsonData._json_()
            else jsonData = await retrieveRepresentation(jsonData)
            if (parameters instanceof FlowObject) parameters = await parameters._json_()
            else parameters = await retrieveRepresentation(parameters)

            method = await retrieveRepresentation(method)
            url = await retrieveRepresentation(url)
            headers = await retrieveRepresentation(headers)
            basicAuth = await retrieveRepresentation(basicAuth)
            
            if (typeof method !== 'string' && !['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'].includes(method.toUpperCase())) {
                await this.newError(errorTypes.TYPE, `The method ${method} is not a valid method.`)
            }
            if (typeof url !== 'string') await this.newError(errorTypes.TYPE, `The url ${url} is not a valid url and it must be a string.`)

            let requestPayload = {
                method: method.toLowerCase(),
                url: url
            }
            requestPayload = await this.defineHeaders(requestPayload, headers)
            requestPayload = await this.defineParams(requestPayload, parameters)
            requestPayload = await this.defineData(requestPayload, data, jsonData)

            try {
                const response = await axios(requestPayload)
                return await this.newHTTPResponse(response)
            } catch (error) {
                return await this.newHTTPResponse(error.response)
            }
        }
    }

    static async documentation(language) {
        const urlDefaultParameter = {
            url: {
                name: strings('flowHTTPUrlParameterName', language),
                description: strings('flowHTTPUrlParameterDescription', language),
                type: 'string',
                required: true
            }
        }

        const basicAuthAndHeadersDefaultParameters = {
            headers: {
                name: strings('flowHTTPHeadersParameterName', language),
                description: strings('flowHTTPHeadersParameterDescription', language),
                type: 'dict',
                required: false
            },
            basicAuth: {
                name: strings('flowHTTPBasicAuthParameterName', language),
                description: strings('flowHTTPBasicAuthParameterDescription', language),
                type: 'dict',
                required: false
            }
        }

        const deleteOrGetParameters = {
            parameters: {
                name: strings('flowHTTPParametersParameterName', language),
                description: strings('flowHTTPParametersParameterDescription', language),
                type: 'dict',
                required: false
            }
        }

        const postOrPutParameters = {
            data: {
                name: strings('flowHTTPDataParameterName', language),
                description: strings('flowHTTPDataParameterDescription', language),
                type: 'dict',
                required: false
            },
            jsonData: {
                name: strings('flowHTTPJsonDataParameterName', language),
                description: strings('flowHTTPJsonDataParameterDescription', language),
                type: 'dict',
                required: false
            }
        }

        return {
            name: strings('flowHTTPModuleName', language),
            description: strings('flowHTTPModuleDescription', language),
            methods: {
                get: {
                    name: strings('flowHTTPGetMethodName', language),
                    description: strings('flowHTTPGetMethodDescription', language),
                    examples: [strings('flowHTTPGetMethodExample', language)],
                    parameters: {
                        ...urlDefaultParameter,
                        ...deleteOrGetParameters,
                        ...basicAuthAndHeadersDefaultParameters
                    }
                },
                post: {
                    name: strings('flowHTTPPostMethodName', language),
                    description: strings('flowHTTPPostMethodDescription', language),
                    examples: strings('flowHTTPPostMethodExample', language),
                    parameters: {
                        ...urlDefaultParameter,
                        ...postOrPutParameters,
                        ...basicAuthAndHeadersDefaultParameters
                    }
                },
                put: {
                    name: strings('flowHTTPPutMethodName', language),
                    description: strings('flowHTTPPutMethodDescription', language),
                    examples: strings('flowHTTPPutMethodExample', language),
                    parameters: {
                        ...urlDefaultParameter,
                        ...postOrPutParameters,
                        ...basicAuthAndHeadersDefaultParameters
                    }
                },
                delete: {
                    name: strings('flowHTTPDeleteMethodName', language),
                    description: strings('flowHTTPDeleteMethodDescription', language),
                    examples: strings('flowHTTPDeleteMethodExample', language),
                    parameters: {
                        ...urlDefaultParameter,
                        ...deleteOrGetParameters,
                        ...basicAuthAndHeadersDefaultParameters
                    }
                },
                request: {
                    name: strings('flowHTTPRequestMethodName', language),
                    description: strings('flowHTTPRequestMethodDescription', language),
                    examples: strings('flowHTTPRequestMethodExample', language),
                    parameters: {
                        method: {
                            name: strings('flowHTTPMethodParameterName', language),
                            description: strings('flowHTTPMethodParameterDescription', language),
                            type: 'string',
                            required: true
                        },
                        ...urlDefaultParameter,
                        ...deleteOrGetParameters,
                        ...postOrPutParameters,
                        ...basicAuthAndHeadersDefaultParameters
                    }
                }
            }
        }
    }
}

module.exports = HTTP