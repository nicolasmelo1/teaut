/** @module src/formula/utils/builtin/objects/boolean */

const FlowInteger = require('./integer')
const { BOOLEAN_TYPE } = require('../types')

/**
 * A boolean value in flow is just a integer more specialized. We extend from the integer here 
 * because the boolean value is understanded as a integer of 1 for true and 0 for false.
 */
class FlowBoolean extends FlowInteger {
    constructor(settings) {
        super(settings, BOOLEAN_TYPE)
    }

    /**
     * Factory method for creating a new Flow Boolean value without needing to initialize everytime.
     * 
     * @param {import('../../settings').Settings} settings - The settings object
     * in flow for the context.
     * @param {string | number | boolean} value - Can be either one of the boolean keywords defined in settings,
     * the number 0 or 1, or a boolean value.
     * 
     * @returns {Promise<FlowBoolean>} - A new FlowBoolean value.
     */
    static async new(settings, value) {
        const flowBoolean = new FlowBoolean(settings)
        return await flowBoolean._initialize_(value)
    }

    /**
     * Initializes the FlowBoolean  with the given value.
     * 
     * @param {string | number | boolean} value - Can be either one of the boolean keywords defined in settings,
     * the number 0 or 1, or a boolean value.
     * 
     * @returns {Promise<FlowBoolean>} - The initialized FlowBoolean value.
     */
    async _initialize_(value) {
        this.value = value
        return this
    }

    /**
     * Returns the boolean value of the FlowBoolean. Since FlowBoolean is a superset of FlowInteger what we do
     * is just return the value of the integer. true is 1 and false is 0.
     * 
     * @returns {Promise<number>} - Returns 0 representing false or 1 representing true.
     */
    async _representation_() {
        if (this.value === true || this.settings.booleanKeywords['true'] === this.value) return 1
        else if (this.value === false || this.settings.booleanKeywords['false'] === this.value) return 0
        else if (this.value === 0 || this.value === 1) return this.value 
        else return 0
    }

    /**
     * Returns the boolean value as a json representation, by default we give the representation as a boolean value
     * either true or false. But flow on the other hand will give us the representation as a number.
     * 
     * @returns {Promise<boolean>} - Returns false representing false or true representing true.
     */
    async _json_() {
        const representation = await this._representation_()
        if (representation === 1) return true
        return false
    }

    /**
     * Returns the boolean value as a string, the string we use to represent the value is the string from the settings.
     * 
     * @returns {Promise<string>} - Returns the string representation from the boolean values from the settings.
     */
    async _string_() {
        const representation = await this._representation_()
        if (representation === 1) return await this.newString(this.settings.booleanKeywords['true'])
        return this.newString(this.settings.booleanKeywords['false'])
    }
}

module.exports = FlowBoolean