/** @module src/formula/utils/builtin/objects/float */

const { FLOAT_TYPE } = require("../types")
const FlowInteger = require("./integer")

/**
 * Represents a Float number inside of flow. If you see it clearly, similarly to FlowBoolean object, the FlowFloat
 * is a superset of a FlowInteger. 
 * 
 * This means we don't need to reimplement everything twice in order for it to work. We just need to work on FlowInteger
 * and FlowFloat and FlowBoolean will always work.
 * 
 * FlowFloat is created when a number has decimal places or the user defines it explicitly like 1.0. These are the only
 * times floats can be created, otherwise we will evaluate them automatically if they have decimal places or not.
 * 
 * IMPORTANT: because javascript is bad all decimal characters will have a maximum of 20 decimal places. 
 * Reference: https://stackoverflow.com/questions/45180970/how-to-display-more-than-20-decimal-points-in-javascript
 */
class FlowFloat extends FlowInteger {
    constructor(settings) {
        super(settings, FLOAT_TYPE)
    }

    /**
     * Constructor for creating a new FlowFloat object without needing to create everytime.
     * 
     * @param {number | string} value - The value of the float. Can be either a number or a string recieved from the token.
     * 
     * @returns {Promise<FlowFloat>} - Returns a new FlowFloat object.
     */
    static async new(settings, value) {
        return await (new FlowFloat(settings))._initialize_(value)
    }

    /**
     * Constructor of the FlowFloat object.
     * 
     * @param {number | string} value - The value of the float. Can be either a number or a string recieved from the token.
     * 
     * @returns {Promise<FlowFloat>} - Returns a new FlowFloat object.
     */
    async _initialize_(value) {
        this.value = value
        return this
    }

    /**
     * Returns a new float with the positive representation of the given float.
     * 
     * @returns {FlowFloat} - The positive representation of this float.
     */
     async _unaryplus_() {
        const representation = await this._representation_()
        return await this.newFloat(+representation)
    }

    /**
     * Returns a new float with the opposite value of this one.
     * 
     * @returns {FlowFloat} - The new float with the opposite value of this one.
     */
    async _unaryminus_() {
        const representation = await this._representation_()
        return await this.newFloat(-representation)
    }

    /**
     * When retrieving the representation of the float we transform it to a string first then change the 'decimalPointCharacter'
     * defined in the context to the '.' so we can effectively represent it as a float in javascript.
     * 
     * @returns {Promise<number>} - Returns the float value or returns the integer value if the number doesn't have decimal places.
     */
    async _representation_() {
        const regexDecimalSeparator = new RegExp(`\\${this.settings.decimalPointCharacter}`, 'g')
        let value = this.value.toString().replace(regexDecimalSeparator, '.')
        value = parseFloat(value)
        value = value % 1 !== 0 ? value : parseInt(value)
        return value
    }

    /**
     * Returns the representation of the float number that can be used in a json object.
     * 
     * @returns {Promise<number>} - Returns the float value.
     */
    async _json_() {
        return await this._representation_()
    }

    /**
     * Returns the string representation of the float. If the representation is a integer we return the float representation
     * with the 'decimalPointCharacter' defined in the context followed by a 0. If the representation is a float we return
     * the float representation changing the default `.` with the 'decimalPointCharacter' defined in the context.
     * 
     * @returns {Promise<string>} - Returns the string representation of the float.
     */
    async _string_() {
        const representation = await this._representation_()
        if (representation % 1 !== 0) {
            return this.newString(representation.toString().replace(/\./g, this.settings.decimalPointCharacter))
        } else {
            return this.newString(`${representation.toString()}${this.settings.decimalPointCharacter}0`)
        }
    }

    /**
     * Hash function used for converting floats to Integers so we can use them as keys in a hash table.
     * I don't know how good this algorith is, but i think people will not generate much hash tables using float 
     * values as keys.
     * 
     * Reference here: https://stackoverflow.com/a/57128247
     * 
     * @returns {number} - The hash value of the float.
     */
     async _hash_() {    
        const representation = await this._representation_()
        if (representation % 1 !== 0) {
            const dataview = new DataView(new ArrayBuffer(8))
            dataview.setFloat64(0, representation)
            return await this.newInteger(Number(dataview.getBigInt64(0)))
        } else {
            return await this.newInteger(representation)
        }
    }
}

module.exports = FlowFloat