/** @module src/formula/utils/builtin/objects/null */

const FlowObject = require('./object')
const { NONE_TYPE } = require('../types')

/**
 * Represents NULL inside of flow. When something has no value.
 */
class FlowNull extends FlowObject {
    constructor(settings) {
        super(settings, NONE_TYPE)
    }

    static async new(settings) {
        return await (new FlowNull(settings))._initialize_()
    }
    
    /**
     * Initializes a new FlowNull object. Containing the value of null.
     * 
     * @returns {Promise<FlowNull>} - Returns a new FlowNull object.
     */
    async _initialize_() {
        this.value = null
        return await super._initialize_()
    }
    
    /**
     * By default the boolean operation of null will always evaluate to false.
     * 
     * @returns {Promise<import('./boolean')>} - Returns false.
     */
    async _boolean_() {
        return await this.newBoolean(false)
    }
    
    /**
     * The actual value from the FlowNull object. The value from 'null'
     * will always be 'null' in the programming language we are using.
     * 
     * @returns {null} - Return null.
     */
    async _representation_() {
        return this.value
    }
    
    /**
     * Returns null as a valid value for the json.
     * 
     * @returns {Promise<null>} - Return null.
     */
    async _json_() {
        return this.value
    }
    /**
     * Used for converting the value here to a string representation so we can display to the user.
     * 
     * @returns {import('./string')} - Returns a new string representing the object value.
     */
    async _string_() {
        return await this.newString(this.settings.nullKeyword)
    }
}

module.exports = FlowNull