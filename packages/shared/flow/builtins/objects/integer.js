/** @module src/formula/utils/builtin/objects/integer */

const FlowObject = require('./object')
const errorTypes = require('../errorTypes')
const { INTEGER_TYPE, FLOAT_TYPE, BOOLEAN_TYPE, STRING_TYPE, LIST_TYPE } = require('../types')


class FlowInteger extends FlowObject {
    /**
     * @param {import('../../settings').Settings} settings - The settings 
     * object.
     */
    constructor (settings, type=INTEGER_TYPE) {
        super(settings, type)
    }
    
    static async new(settings, value) {
        return await (new FlowInteger(settings))._initialize_(value)
    }

    async _initialize_(value) {
        this.value = value
        return super._initialize_()
    }

    /**
     * On integers we can only add between Floats, Integers or Boolean.
     * We can also add floats and numbers together because they are common in many use cases.
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat} obj - The object to add to this one. Can be a 
     * boolean a integer or a float only.
     * 
     * @returns {FlowInteger | FlowFloat} - The result of the addition. Adding a float to an integer gives a float by default.
     */
    async _add_(obj) {
        if ([INTEGER_TYPE, BOOLEAN_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            const result = representation + objectRepresentation
            // Reference: https://stackoverflow.com/a/2304062
            if (result % 1 === 0) {
                return await this.newInteger(result)
            } else {
                // Fix the float issue with javascript, try to get the result of 1.11 + 1.2 
                // in node and you will see the problem.
                const representationNumberOfDecimals = (representation.toString().split('.')[1] || []).length
                const objRepresentationNumberOfDecimals = (objectRepresentation.toString().split('.')[1] || []).length
                return await this.newFloat(result.toFixed(Math.max(representationNumberOfDecimals, objRepresentationNumberOfDecimals)))
            }
        } else if (obj.type === STRING_TYPE && [INTEGER_TYPE, FLOAT_TYPE].includes(this.type)) {
            const thisString = await (await this._string_())._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newString(thisString + objectRepresentation)
        } else {
            await super._add_(obj)
        }
    }

    /**
     * On integers we can only subtract between Floats, Integers or Boolean.
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat} obj - The object to subtract to this one. Can be a 
     * boolean a integer or a float only.
     * 
     * @returns {FlowInteger | FlowFloat} - The result of the subtraction. Subtracting a float to an integer gives a float by default.
     */
    async _subtract_(obj) {
        if ([INTEGER_TYPE, BOOLEAN_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            const result = representation - objectRepresentation
            // Reference: https://stackoverflow.com/a/2304062
            if (result % 1 === 0) {
                return await this.newInteger(result)
            } else {
                // Fix the float issue with javascript, try to get the result of 1.11 + 1.2 
                // in node and you will see the problem.
                const representationNumberOfDecimals = (representation.toString().split('.')[1] || []).length
                const objRepresentationNumberOfDecimals = (objectRepresentation.toString().split('.')[1] || []).length
                return await this.newFloat(result.toFixed(Math.max(representationNumberOfDecimals, objRepresentationNumberOfDecimals)))
            }
        } else {
            await super._subtract_(obj)
        }
    }

    /**
     * Multiplication with integers are supported between string, float, other ints, or boolean all other types are unsuported.
     * When the user multiplies a string with an int we repeat the string n times, returning a new string object,
     * When the user multiplies with a float we return a new float object, as it should be expected.
     * Last but not least when the user multiplies with int we return a new object of type int with the newly created value
     * If we multiply an integer by a list we will return a new list repeated n times with the elements
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat | FlowString | import('./list')} obj - The object to subtract to this one. Can be a 
     * boolean a integer, a float or a String, if it is a string returns a string.
     * 
     * @returns {FlowInteger | FlowFloat | FlowString} - The result of the multiply. Multiply a float to an integer gives a float by default.
     * Multiplying a string repeats the string n times and return a string.
     */
    async _multiply_(obj) {
        if ([INTEGER_TYPE, BOOLEAN_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            const result = representation * objectRepresentation
            // Reference: https://stackoverflow.com/a/2304062
            if (result % 1 === 0) {
                return await this.newInteger(result)
            } else {
                return await this.newFloat(result)
            }
        } else if (obj.type == STRING_TYPE && this.type == INTEGER_TYPE) {
            const objectRepresentation = await obj._representation_()
            return await this.newString(objectRepresentation.repeat(await this._representation_()))
        } else if (obj.type == LIST_TYPE && this.type == INTEGER_TYPE) {
            let newArray = []
            const numberOfTimes = await this._representation_()
            for (let repeat = 0; repeat < numberOfTimes; repeat++) {
                for (let i = 0; i < obj.array.numberOfElements; i++) {
                    newArray.push(await obj.array.getItem(i))
                }
            }
            return await this.newList(newArray)
            
        } else {
            await super._multiply_(obj)
        }
    }

    /**
     * You can either divide by an integer, by a float or by Boolean, also remember, you can't divide by 0
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat} obj - The object to divide to this one. Can be a 
     * boolean a integer or a float only. Cannot be 0
     * 
     * @returns {FlowInteger | FlowFloat} - The result of the division. Dviding a float to an integer gives a float by default.
     */
    async _divide_(obj) {
        if ([INTEGER_TYPE, BOOLEAN_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            if (objectRepresentation === 0) {
                await this.newError(errorTypes.ZERO_DIVISION, 'Cannot divide by 0')
            } else {
                const result = representation / objectRepresentation
                // Reference: https://stackoverflow.com/a/2304062
                if (result % 1 === 0) {
                    return await this.newInteger(result)
                } else {
                    return await this.newFloat(result)
                }
            }
        } else {
            await super._divide_(obj)
        }
    }

    /**
     * You can either take the remainder of an integer, a float or a Boolean, also remember, you can't divide by 0
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat} obj - The object to take remainder from this one. Can be a 
     * boolean a integer or a float only. Cannot be 0
     * 
     * @returns {FlowInteger | FlowFloat} - The result of the rmainder. Taking the remainder of a float to an integer gives a float by default.
     */
    async _remainder_(obj) {
        if ([INTEGER_TYPE, BOOLEAN_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            if (objectRepresentation === 0) {
                await this.newError(errorTypes.ZERO_DIVISION, 'Cannot divide by 0')
            } else {
                const result = representation % objectRepresentation
                // Reference: https://stackoverflow.com/a/2304062
                if (result % 1 === 0) {
                    return await this.newInteger(result)
                } else {
                    return await this.newFloat(result)
                }
            }
        } else {
            await super._remainder_(obj)
        }
    }

    /**
     * You can either take the power of an integer, a float or a Boolean, also remember, you can't divide by 0
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat} obj - The object to take power from this one. Can be a 
     * boolean a integer or a float only. Cannot be 0
     * 
     * @returns {FlowInteger | FlowFloat} - The result of the power. Taking the power of a float to an integer gives a float by default.
     */
     async _power_(obj) {
        if ([INTEGER_TYPE, BOOLEAN_TYPE, FLOAT_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            const result = Math.pow(representation, objectRepresentation)
            // Reference: https://stackoverflow.com/a/2304062
            if (result % 1 === 0) {
                return await this.newInteger(result)
            } else {
                return await this.newFloat(result)
            }
        } else {
            await super._power_(obj)
        }
    }

    /**
     * For truthy or Falsy values in ints, if the value is 0 then it is represented as False, otherwise it is represented
     * as True.
     * 
     * @returns {FlowBoolean} - The boolean representation of this object.
     */
    async _boolean_() {
        const representation = await this._representation_()

        if (representation === 0) {
            return await this.newBoolean(false)
        } else {
            return await this.newBoolean(true)
        }
    }
    
    /**
     * When it's equals we convert the boolean representation to either 1 or 0 if the value is a boolean othewise we only
     * compare to float or int. We also convert the float to integer so 1.0 is equal to 1
     * 
     * @param {FlowBoolean | FlowInteger | FlowFloat} obj - The object to compare to this one and check if it's equal.
     * 
     * @returns {FlowBoolean} - The boolean representation of this object.
     */
    async _equals(obj) {
        if ([INTEGER_TYPE, FLOAT_TYPE, BOOLEAN_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newBoolean(representation === objectRepresentation)
        } else {
            return await super._equals(obj)
        }
    }

    /**
     * Checks if a given integer is less than the other. We are able to compare this to
     * Boolean, Floats and Integer types. Other types are not supported.
     * 
     * Example:
     * ```
     * True > 2 == False
     * True > 0 == True
     * ```
     * 
     * @param {import('./object')} obj - The object to compare must be a integer a float or a boolean.
     * 
     * @returns {Promise<import('./boolean')>} - Returns if this value is less than the other.
     */
    async _lessthan_(obj) {
        if ([INTEGER_TYPE, FLOAT_TYPE, BOOLEAN_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newBoolean(representation < objectRepresentation)
        } else {
            return await super._equals(obj)
        }
    }

    /**
     * Checks if a given integer is greater than the other. We are able to compare this to
     * Boolean, Floats and Integer types. Other types are not supported.
     * 
     * Example:
     * ```
     * 1 < 0 == False
     * 1 < 1.123 == False
     * ```
     * 
     * @param {import('./object')} obj - The object to compare must be a integer a float or a boolean.
     * 
     * @returns {Promise<import('./boolean')>} - Returns if this value is greater than the other.
     */
    async _greaterthan_(obj) {
        if ([INTEGER_TYPE, FLOAT_TYPE, BOOLEAN_TYPE].includes(obj.type)) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newBoolean(representation > objectRepresentation)
        } else {
            return await super._equals(obj)
        }
    }

    /**
     * Returns a new integer with the positive representation of the given integer.
     * 
     * @returns {FlowInteger} - The positive representation of this integer.
     */
    async _unaryplus_() {
        const representation = await this._representation_()
        return await this.newInteger(+representation)
    }

    /**
     * Returns a new integer with the opposite value of this one.
     * 
     * @returns {FlowInteger} - The new integer with the opposite value of this one.
     */
    async _unaryminus_() {
        const representation = await this._representation_()
        return await this.newInteger(-representation)
    }
    
    /**
     * It's hard to work with numbers on javascript. Because of that what we do is check if the number is above the maximum
     * representable value or less than the maximum representable value in javascript. 
     * Also we check if the value is a NaN and throw an error if it is.
     * 
     * @returns {Promise<number>} - The representation of this object.
     */
    async _representation_() {
        if (this.value === Number.POSITIVE_INFINITY || this.value === -Number.NEGATIVE_INFINITY) {
            await this.newError(errorTypes.NUMBER_TOO_BIG, `Number cannot be greater ${Number.MAX_SAFE_INTEGER} or less than ${Number.MIN_SAFE_INTEGER}.`)
        } else if (isNaN(this.value)) {
            await this.newError(errorTypes.TYPE, `Invalid number.`)
        } else {
            return parseInt(this.value)
        }
    }

    /**
     * Returns the json representation of the number, which is the actual number from the _representation_ function.
     * 
     * @returns {Promise<number>} - The json representation of the number.
     */
    async _json_() {
        return await this._representation_()
    }

    /**
     * Returns the string representation of the number, which is a number but stringfied.
     * 
     * @returns {Promise<string>} - The string representation of the number.
     */
    async _string_() {
        return await this.newString(`${this.value}`)
    }

    /**
     * Returns the actual number as hash, this might not be efficient for collisions, but python has a deep explanation
     * why this is a good strategy for the hashing algorithm of integers. We use the same strategy here.
     * 
     * @returns {FlowInteger} - Returns the actual object with the number.
     */
    async _hash_() {
        return this
    }
}

module.exports = FlowInteger