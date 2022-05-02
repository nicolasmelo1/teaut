/** @module src/formula/utils/builtin/objects/error */

const { ERROR_TYPE } = require('../types')
const FlowObject = require('./object')

/**
 * By default it throws an error when is initialized. We have an error type that we can use for stuff.
 */
class FlowError extends FlowObject {
    constructor(settings) {
        super(settings, ERROR_TYPE)
    }

    static async new(settings, errorType, message) {
        return await (new FlowError(settings))._initialize_(errorType, message)
    }

    /**
     * By default when we initialize this method we throw an error. But we might add the _throw_ dunder method in the
     * future to be able to throw an error. By doing this we will be able to create any error we want or need.
     * 
     * @param {import('../errorTypes')} errorType - The type of the error we want to throw.
     * @param {string} message - The message of the error we want to throw.
     */
    async _initialize_(errorType, message) {
        this.errorType = errorType instanceof FlowObject ? errorType : await this.newString(errorType)
        this.message = message instanceof FlowObject ? message : await this.newString(message)
        this.parameters 
        throw this
    }   

    /**
     * Returns a nice representation of the error object for the user so he can effectively debug his code.
     * 
     * @returns {Promise<import('./string')>} - Returns a string representation of the error.
     */
    async _string_() {
        return await this.newString(`(${await this.errorType._representation_()}): ${await (await this.message._string_())._representation_()}`)
    }
}

module.exports = FlowError