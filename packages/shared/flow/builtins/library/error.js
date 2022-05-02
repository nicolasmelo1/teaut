const { LibraryModule } = require('.')
const errorTypes = require('../errorTypes')
const { FlowError, FlowString, FlowObject } = require('../objects')


class Error_ extends LibraryModule {
    methods = {
        /**
         * Checks if a given value is an error, if it is we return true, otherwise we return false.
         * 
         * @param {object} params - The parameters to the `isError` function.
         * @param {FlowObject} params.value - The value to check if it's an error.
         * 
         * @return {Promise<import('../objects/boolean')>} - The result of the `isError` function. True if it's an error, false otherwise.
         */
        isError: async({ value } = {}) => {
            return await this.newBoolean(value instanceof FlowError)
        },
        /**
         * Creates a new error object in flow. This new error will throw an error and stop the execution of the program.
         * 
         * This is also baked into the language itself with the expression:
         * ```
         * raise "CustomError": "Error" == Error.new("CustomError", "Error")
         * ```
         * 
         * @param {object} params - The parameters to the `new` function.
         * @param {FlowString} params.type - The type of the error. Should be a string.
         * @param {FlowObject} params.message - The message of the error. Can be anything inside of flow.
         * 
         * @return {Promise<import('../objects/error')>} - The new error object.
         */
        new: async({ type, message } = {}) => {
            if (type instanceof FlowString && message instanceof FlowObject) {
                return await this.newError(type, message)
            } else {
                if (!type instanceof FlowString) this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['new'][0]} should be a string.`)
                if (!type instanceof FlowObject) this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['new'][0]} should be a valid flow object.`)
            }
        },
        /**
         * Gets the message of the error, it's useful for debugging purposes or when you just need the message of the error for something.
         * It'll probably be the most used function of this module.
         * 
         * @param {object} params - The parameters to the `message` function.
         * @param {FlowError} params.value - The error to get the message from.
         * 
         * @returns {Promise<FlowObject>} - The message of the error.
         */
        message: async({ error } = {}) => {
            if (error instanceof FlowError) {
                return error.message
            } else {
                this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['message'][0]} should be an error.`)
            }
        },
        /**
         * Gets the type of the error, it's useful for debugging purposes or when you just need the type of the error for something.
         * For example, when the error is of type "something" then do this chunk of code, else do this other chunk of code.
         * 
         * @param {object} params - The parameters to the `type` function.
         * @param {FlowError} params.value - The error to get the type from.
         * 
         * @returns {Promise<FlowObject>} - The type of the error.
         */
        type: async({ error } = {}) => {
            if (error instanceof FlowError) {
                return error.errorType
            } else {
                this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['message'][0]} should be an error.`)
            }
        }
    }

    static async documentation() {
        
    }
}

module.exports = Error_