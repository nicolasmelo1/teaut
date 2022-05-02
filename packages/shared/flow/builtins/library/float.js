const { LibraryModule } = require(".")
const { retrieveRepresentation } = require("../../helpers/library")
const errorTypes = require("../errorTypes")
const { FlowFloat, FlowString } = require("../objects")
const { FLOAT_TYPE, INTEGER_TYPE } = require("../types")


class Float extends LibraryModule {
    methods = {
        /**
         * Checks if a given number is a float.
         * 
         * @param {object} params - The parameters for the `isFloat` method.
         * @param {FlowFloat} params.number - The number to check if it's a float or not.
         * 
         * @returns {Promise<import('../objects/boolean')>} - `true` if the number is a float, `false` otherwise.
         */
        isFloat: async({ number } = {}) => {
            return await this.newBoolean(number instanceof FlowFloat)
        },
        /**
         * Tries to parse a number to a new float number. We will throw an error if it can't parse.
         * 
         * @param {object} params - The parameters for the `fromString` method.
         * @param {FlowString} params.string - The string to parse to a float.
         * 
         * @returns {Promise<import('../objects/float')>} - The parsed float number.
         */
        fromString: async({ string } = {}) => {
            if (string instanceof FlowString) {
                string = await retrieveRepresentation(string)
                if (!Number.isNaN(parseFloat(string.replace(this.settings.decimalPointCharacter, '.')))) {
                    return await this.newFloat(parseFloat(string.replace(this.settings.decimalPointCharacter, '.')))
                } else {
                    await this.newError(errorTypes.VALUE, `Could not convert the string '${string}' to a float.`)
                }
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['fromString'][0]}' should be a string.`)
            }
        },
        /**
         * Gets the float value as a string.
         * 
         * @param {object} params - The parameters for the `toString` function.
         * @param {FlowFloat} params.number - The number to convert to a string.
         * 
         * @returns {Promise<import('../objects/string')>} - The string representation of the number.
         */
        toString: async({ number } = {}) => {
            return await number._string_()
        },
        /**
         * This will retrieve the ceil value of the given float number.
         * 
         * @param {object} params - The parameters of the `ceil` function.
         * @param {FlowFloat} params.number - The number to ceil. Should be a Float.
         * 
         * @returns {Promise<import('../objects/integer')>} - The ceil value of the given float number.
         */
        ceil: async({ number } = {}) => {
            number = await retrieveRepresentation(number)
            return await this.newInteger(Math.ceil(number))
        },
        /**
         * This will retrieve the floor value of the given float number.
         * 
         * @param {object} params - The parameters of the `floor` function.
         * @param {FlowFloat} params.number - The number to floor. Should be a Float.
         * 
         * @returns {Promise<import('../objects/integer')>} - The floor value of the given float number.
         */
        floor: async({ number } = {}) => {
            if (number instanceof FlowFloat) {
                number = await retrieveRepresentation(number)
                return await this.newInteger(Math.floor(number))
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['floor'][0]}' should be a float value.`)
            }
        },
        /**
         * IMPORTANT: Because javascript is bad we only allow at the current time the decimal places to be a maximum of 20.
         * Reference: https://stackoverflow.com/questions/45180970/how-to-display-more-than-20-decimal-points-in-javascript
         * 
         * So what this does is that this rounds the number to fixed amount of decimal places, if the number of decimal places is 0
         * then we will return an integer.
         * 
         * We do not enforce the number of decimalPlaces though, if it is more than 20 and less than 0 we just return a new float with the number.
         * 
         * @param {object} params - The parameters of the `round` function.
         * @param {import('../objects/integer') | import('../objects/float')} params.number - The number that we want to round the value.
         * @param {import('../objects/integer')} params.decimalPlaces - The number of decimal places we want to round to. Can be a minumum of 0 and a maximum of 20.
         * 
         * @returns {Promise<import('../objects/float')>} - The rounded number.
         */
        round: async({ number, decimalPlaces=0 } = {}) => {
            if ([FLOAT_TYPE, INTEGER_TYPE].includes(number.type) && decimalPlaces.type === INTEGER_TYPE) {
                number = await retrieveRepresentation(number)
                decimalPlaces = await retrieveRepresentation(decimalPlaces)

                if (decimalPlaces >= 0 && decimalPlaces <= 20) {
                    const numberFixed = Number(number).toFixed(decimalPlaces)
                    if (decimalPlaces === 0) {
                        return await this.newInteger(numberFixed)
                    } else {
                        return await this.newFloat(numberFixed)
                    }
                } else {
                    return this.newFloat(number)
                }
            } else {
                if (![FLOAT_TYPE, INTEGER_TYPE].includes(number.type)) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['round'][0]}' needs to be a valid number. Either a float or an int.`)
                if (!decimalPlaces.type !== INTEGER_TYPE) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['round'][1]}' needs to be a integer.`)
            }
        }
    }

    static async documentation() {

    }
}

module.exports = Float