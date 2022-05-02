/** @module src/formula/utils/builtin/objects/string */

const FlowObject = require('./object') 
const { STRING_TYPE, INTEGER_TYPE, FLOAT_TYPE } = require("../types")
const { TYPE } = require('../errorTypes')

/**
 * This represents a string in flow. Everything is a string, obviously.
 */
class FlowString extends FlowObject {
    /**
     * @param {import('../../settings').Settings} settings - The settings 
     * object.
     */
    constructor (settings) {
        super(settings, STRING_TYPE)
    }
    
    /**
     * Creates a new flow string from a given value.
     * 
     * @param {import('../../settings').Settings} settings - The settings object
     * in flow for the context.
     * @param {string} value - The string value to be converted to a FlowString.
     * 
     * @returns {Promise<FlowString>} - A new FlowString object instance.
     */
    static async new(settings, value) {
        return await (new FlowString(settings))._initialize_(value)
    }

    /**
     * Similar to a constructor method in flow.
     * 
     * @returns {Promise<FlowString>} - The flow string returned.
     */
    async _initialize_(value) {
        this.value = value
        return super._initialize_()
    }

    /**
     * Gets an item using the slice. For example: 
     * `"string"[1] === "t"`
     * 
     * @param {import('./object')} item - The item to get the value from. Can be
     * any value. 
     * 
     * @returns {Promise<FlowString>} - Retrieves the character at the certaing index.
     */
    async _getitem_(item) {
        if (item.type === INTEGER_TYPE) {
            const representation = await this._representation_()
            const itemRepresentation = await item._representation_()
            return await this.newString(representation[itemRepresentation])
        } else {
            await this.newError(TYPE, `Only '${INTEGER_TYPE}' in slices are valid to retrieve indexes from strings.`)
        }
    }
    
    /**
     * Appends a new character to the string when the other value is a string.
     * For example "add" + "Something" transforms the string to "addSomething" We can also add floats and numbers together
     * because they are common in many use cases.
     * 
     * @param {import('./object')} obj - Any flow objects can be sent here but we will only accpet adding
     * strings to strings.
     * 
     * @returns {Promise<FlowString} - The new string character concatenated.
     */
    async _add_(obj) {
        if (obj.type === STRING_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newString(representation + objectRepresentation)
        }  else if ([INTEGER_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const objectString = await (await obj._string_())._representation_()
            const representation = await this._representation_()
            return await this.newString(representation + objectString)
        } 
        else {
            await this.newError(TYPE, `Only a '${STRING_TYPE}' can add another '${STRING_TYPE}'.`)
        }
    }

    /**
     * The subtract is kinda strange because it's not common in other languages but can offer
     * a really nice functionality in flow. When the user subtracts another string we will remove all
     * of the occurrences of this string in the left string. Example:
     * ```
     * "addSubtract" - "Subtract" == "add"
     * ```
     * 
     * or 
     * 
     * ```
     * "SubtractaddSubtract" - "Subtract" == "add"
     * ```
     * 
     * @param {import('./object')} obj - Any flow object to subtract, to be accepted it needs to be a FlowString.
     * 
     * @returns {Promise<FlowString>} - Returns the string without the string on the right.
     */
    async _subtract_(obj) {
        if (obj.type === STRING_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newString(representation.replaceAll(objectRepresentation, ''))
        } else {
            await this.newError(TYPE, `Only a '${STRING_TYPE}' can subtract another '${STRING_TYPE}'.`)
        }
    }

    /**
     * When we multiply a string with a number we create a new string repeated n times. For example:
     * 
     * ```
     * "multiply" * 5 == "multiplymultiplymultiplymultiplymultiply"
     * ```
     * 
     * @param {import('./object')} obj - The object to multiply the string for.
     * 
     * @returns {Promise<FlowString>} - The new string repeated. 
     */
    async _multiply_(obj) {
        if (obj.type === INTEGER_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newString(representation.repeat(objectRepresentation))
        } else {
            return await super._multiply_(obj)
        }
    }

    /**
     * Checks if a substring exists in a string. Returns true if it exists or false if not.
     * 
     * Example:
     * ```
     * "fox" in "The brown fox jumped over the fence" == True
     * ```
     * 
     * @param {import('./object')} obj - The obj to check if exists in the string, accepts only strings as the right value on
     * left value.
     * 
     * @returns {Promise<import('./boolean')>} - Returns a new FlowBoolean object.
     */
    async _in_(obj) {
        if (item.type === STRING_TYPE) {
            const objectRepresentation = await obj._representation_()
            const representation = await this._representation_()
            return await this.newBoolean(objectRepresentation.includes(representation))
        } else {
            await this.newError(TYPE, `Cannot check for '${obj.type}'`)
        }
    }

    /**
     * If the length of the string is less than the length of whatever value you are sending to compare, then we return true
     * otherwise we return false.
     * 
     * For example:
     * ```
     * "fox" < "The brown fox jumped over the fence" == True
     * 
     * "fox" < [1, 2] == False
     * ```
     * 
     * @param {FlowObject} obj - The value to compare the length of the string with.
     * 
     * @param {import('./boolean')} - Returns true if the length of the string is less then the length of the value, 
     * otherwise returns false.
     */
     async _lessthan_(obj) {
        try {
            const lengthInteger = await this._length_()
            const objectLengthInteger = await obj._length_()
            return await this.newBoolean(await lengthInteger._representation_() < await objectLengthInteger._representation_())
        } catch (error) {
            const FlowError = require('./error')
            if (error instanceof FlowError) {
                return await super._lessthan_(obj)
            } else {
                throw error
            }
        }
    }

    /**
     * If the length of the string is greater than the length of whatever value you are sending to compare, then we return true
     * otherwise we return false.
     * 
     * For example:
     * ```
     * "fox" > "The brown fox jumped over the fence" == True
     * 
     * "fox" > [1, 2] == True
     * ```
     * 
     * @param {FlowObject} obj - The value to compare the length of the string with.
     * 
     * @param {import('./boolean')} - Returns true if the length of the string is greater then the length of the value, 
     * otherwise returns false.
     */
    async _greaterthan_(obj) {
        try {
            const lengthInteger = await this._length_()
            const objectLengthInteger = await obj._length_()
            return await this.newBoolean(await lengthInteger._representation_() > await objectLengthInteger._representation_())
        } catch (error) {
            const FlowError = require('./error')
            if (error instanceof FlowError) {
                return await super._greaterthan_(obj)
            } else {
                throw error
            }
        }
    }
    
    /**
     * Returns True if the field is not a blank value, otherwise return False.
     * 
     * @returns {import('./boolean')} - Returns a new FlowBoolean object representing either
     * true or false.
     */
    async _boolean_() {
        const representation = await this._representation_()
        if (representation === '') {
            return await this.newBoolean(false)
        } else {
            return await this.newBoolean(true)
        }
    }

    /**
     * Returns a new javascript string to be used in calculations
     * 
     * @returns {Promise<string>} - The value inside of FlowString as string.
     */
    async _representation_() {
        return this.value.toString()
    } 

    /** 
     * The json representation of a string is the actual representation of the value.
     * 
     * @returns {Promise<string>} - The json representation of the value.
     */
    async _json_() {
        return await this._representation_()
    }

    /**
     * Returns a new flow string to safely evaluate the representation of this object for the "outside" world.
     * 
     * @returns {Promise<FlowString>} - The new string to be generated.
     */
    async _string_() {
        const representation = await this._representation_()
        return await this.newString(`"${representation}"`)
    }

    /**
     * Reference for this hash function: https://www.geeksforgeeks.org/string-hashing-using-polynomial-rolling-hash-function/#:~:text=String%20hashing%20is%20the%20way,strings%20having%20the%20same%20hash)
     * 
     * Hashes to string to be used in the HashMap implementation for dicts.
     * 
     * @returns {Promise<import('./integer')>} - The hash number of the string.
     */
    async _hash_() {
        const representation = await this._representation_()
        // P and M
        const p = 53
        const m = 1e9 + 9
        let powerOfP = 1
        let hashValue = 0
    
        // Loop to calculate the hash value
        // by iterating over the elements of string
        // javascript's ord() function is `.charCodeAt`
        // reference: https://stackoverflow.com/a/40100290
        for (let i=0; i < representation.length; i++) {
            hashValue = ((hashValue + (representation[i].charCodeAt(0) - 'a'.charCodeAt(0) + 1) * powerOfP) % m)
            powerOfP = (powerOfP * p) % m
        }
    
        return await this.newInteger(hashValue)
    }

    /**
     * Gets the length of the string as an integer.
     * 
     * @returns {Promise<import('./integer')>} - The length of the string as an integer.
     */
    async _length_() {
        const representation = await this._representation_()
        return await this.newInteger(representation.length)
    }
}

module.exports = FlowString