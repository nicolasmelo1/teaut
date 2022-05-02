const { LibraryModule } = require(".")
const { retrieveRepresentation } = require("../../helpers/library")
const { FlowInteger, FlowString } = require("../objects")


class Integer extends LibraryModule {
    methods = {
        /**
         * Checks if a given number is an integer or not.
         * 
         * @param {object} params - The parameters for the `isInteger` function.
         * @param {number} params.number - The number to check if it's an integer.
         * 
         * @returns {Promise<import('../objects/boolean')>} - The result of the `isInteger` function can be either `True` or `False`.
         */
        isInteger: async ({ number } = {}) => {
            return await this.newBoolean(number instanceof FlowInteger)
        },
        /**
         * Tries to parse a number to a new integer number. We will throw an error if it can't parse.
         * 
         * @param {object} params - The parameters for the `fromString` method.
         * @param {FlowString} params.string - The string to parse to a integer.
         * 
         * @returns {Promise<import('../objects/integer')>} - The parsed integer number.
         */
        fromString: async ({ string } = {}) => {
            if (string instanceof FlowString) {
                string = await retrieveRepresentation(string)
                if (!Number.isNaN(parseInt(string))) {
                    return await this.newInteger(parseInt(string))
                } else {
                    await this.newError(errorTypes.VALUE, `Could not convert the string '${string}' to a float.`)
                }
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['fromString'][0]}' should be a string.`)
            }
        },
        /**
         * Returns the integer as a string.
         * 
         * @param {object} params - The parameters for the `toString` function.
         * @param {FlowInteger} params.number - The number to convert to a string.
         * 
         * @returns {Promise<import('../objects/string')>} - The result of the `toString` function is a FlowString.
         */
        toString: async ({ number } = {}) => {
            return await number._string_()
        }
    }
}

module.exports = Integer