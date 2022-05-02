/** @module src/formula/utils/builtin/objects/list */

const FlowObject = require('./object')
const { LIST_TYPE, INTEGER_TYPE } = require('../types')
const errorTypes = require('../errorTypes')
const { DynamicArrayHelper } = require('../../helpers')

/**
 * Represents an array of objects inside of flow. This array of objects can be of any type.
 * 
 * FlowList is created when the user defines it explicitly like [1, 2, 3]. 
 * 
 * This works similarly to FlowDict, except that we find elements by a given index and not by a given key.
 * 
 * Be aware that this object uses `.appendParentResetCached()` and `.resetCached()` functions from the parent object.
 * Both functions are used to reset the cached representation of the dict/list so we do not need to build it everytime.
 */
class FlowList extends FlowObject {
    constructor(settings) {
        super(settings, LIST_TYPE)
    }

    static async new(settings, values) {
        return await (new FlowList(settings))._initialize_(values)
    }

    /**
     * Initializes the list with the given list of values and then return a new FlowList
     * 
     * @param {Array<FlowObject>} [values=[]] - The values to be converted to a FlowList.
     * 
     * @returns {Promise<FlowList>} - Returns a new FlowList with the given values.
     */
    async _initialize_(values=[]) {
        for (const value of values) {
            await this.appendParentResetCached(value)
        }

        /** @type {DynamicArrayHelper} */
        this.array = await DynamicArrayHelper.initialize(values)
        
        await this.resetCached()

        return super._initialize_()
    }

    /** 
     * Similar to python, when we sum two lists together we concatenate these two lists returning a new list.
     * 
     * @param {FlowList} obj - The other list to be concatenated with the current list.
     * 
     * @returns {Promise<FlowList>} - Returns a new list with the concatenated values.
     */
    async _add_(obj) {
        if (obj.type === LIST_TYPE) {
            const newArray = []
            for (let i=0; i<this.array.numberOfElements; i++) {
                newArray.push(await this.array.getItem(i))
            }
            for (let i=0; i<obj.array.numberOfElements; i++) {
                newArray.push(await obj.array.getItem(i))
            }
            return await this.newList(newArray)
        } else {
            return await super._add_(obj)
        }
    }

    /**
     * When we subtract by a number we remove the index from the list, this way we can remove items from the list
     * as we want to, without any special keywords like del or delete.
     * 
     * Example: [1, 2, 3] - 0 = [2, 3]
     * 
     * @param {FlowObject} obj - The value to subtract from the list.
     * 
     * @returns {Promise<FlowList>} - Returns the same list but with the given index removed.
     */
    async _subtract_(obj) {
        if (obj.type === INTEGER_TYPE) {
            const indexToDelete = await obj._representation_()

            const isArrayEmpty = this.array.numberOfElements == 0
            const isIndexBiggerThanNumberOfElements = index >= this.array.numberOfElements

            if (isArrayEmpty) {
                await this.newError(errorTypes.INDEX_ERROR, `List is empty`)
            } else if (isIndexBiggerThanNumberOfElements) {
                await this.newError(errorTypes.INDEX_ERROR, `Cannot remove index. You can delete from index 0 to ${this.array.numberOfElements - 1}`)
            } else {
                await this.array.removeAt(indexToDelete)
                return this
            }
        } else {
            return await super._subtract_(obj)
        }
    }

    /**
     * If we multiply the list by a number we return a new list with the elements repeated that many times.
     * 
     * @param {FlowObject} obj - The number to multiply the list by.
     * 
     * @returns {Promise<FlowList>} - Returns a new list with the elements repeated that many times.
     */
    async _multiply_(obj) {
        if (obj.type === INTEGER_TYPE) {
            let newArray = []
            const numberOfTimes = await obj._representation_()
            for (let repeat = 0; repeat < numberOfTimes; repeat++) {
                for (let i = 0; i < this.array.numberOfElements; i++) {
                    newArray.push(await this.array.getItem(i))
                }
            }
            return await this.newList(newArray)
        } else {
            return await super._multiply_(obj)
        }
    }

    /**
     * Retrieves an item from the list by the given index.
     * 
     * @param {import('./integer')} index - The index of the item to be retrieved.
     * 
     * @returns {Promise<FlowObject>} - Returns the item at the given index, this item can be any FlowObject.
     */
    async _getitem_(item) {
        if (item.type === INTEGER_TYPE) {
            const index = await item._representation_()
            return await this.array.getItem(index)
        } else {
            await this.newError(errorTypes.TYPE, `Only '${INTEGER_TYPE}' in slices are valid to retrieve indexes from lists.`)
        }
    }

    /**
     * Sets an item in the list by the given index.
     * 
     * @param {import('./integer')} index - The index of the list to set the item to.
     * @param {FlowObject} value - The value to be set to the list.
     * 
     * @returns {Promise<FlowObject>} - Returns the value that was set to the list.
     */
    async _setitem_(item, value) {
        if (item.type === INTEGER_TYPE) {
            const index = await item._representation_()
            // Resets the cached representation since a new item was inserted.
            await this.resetCached()
            await this.appendParentResetCached(value)

            await this.array.insertAt(value, index, true)
            return value
        } else {
            await this.newError(errorTypes.TYPE, `Only '${INTEGER_TYPE}' in slices are valid to set values in lists.`)
        }
    }

    /**
     * Checks if a given value exists in the list.
     * 
     * @param {FlowObject} obj - The value to check if it exists inside of the list.
     * 
     * @returns {Promise<FlowObject>} - Returns true if the value exists in the list, otherwise returns false.
     */
    async _in_(obj) {
        const representation = await this._representation_()
        const objectRepresentation = await obj._representation_()

        return await this.newBoolean(representation.includes(objectRepresentation))
    }
    /**
     * This checks if two values are equal, we will only check for equality in lists if the other value is a list, 
     * if the other value is not a list then we leave for the object to check equality. Usually it will return false
     * because the types will be different.
     * 
     * For checking equality we pass throgh 3 steps, first we check if both lists being compared have the same length.
     * 1 - If they don't we already leave the comparison and doesn't check anything else. 
     * 2 - If they do then we need to check the stringfied representation of the list and compare if they are equal. Why we go through
     * this step? because we usually call the representation for everything, and since the representation is cached in the
     * list it might not consume much time to retrieve it again. Why we stringfy the representation?
     * Because javascript arrays will never be equal (Check ```[1, 2, 3] === [1, 2, 3]```)
     * 3 - If the representation is equal then the last step is to check the string representation of the list. This string representation
     * is what is returned from '_string_'. This is to prevent the actual javascript evaluation of what is equal and not. 
     * This will guarantee that to objects are equal by the string representation of them.
     *  
     * @param {FlowList} obj - We only check for equality if the other value is a list, otherwise we leave for the FlowObject to handle. 
     * 
     * @returns {Promise<import('./boolean')>} - Returns true if the two lists are equal, otherwise returns false.
     */
    async _equals_(obj) {
        if (obj.type === LIST_TYPE) {
            const lengthInteger = await this._length_()
            const objectLengthInteger = await obj._length_()
            if (await lengthInteger._representation_() !== await objectLengthInteger._representation_()) {
                return await this.newBoolean(false)
            } else {
                // The representation is cached so we can safely compare both.
                const representation = await this._representation_()
                const objectRepresentation = await obj._representation_()
                if (JSON.stringify(representation) !== JSON.stringify(objectRepresentation)) {
                    return await this.newBoolean(false)
                } else {
                    const stringfiedRepresentation = await (await this._string_())._representation_()
                    const objectStringfiedRepresentation = await (await obj._string_())._representation_()
                    return await this.newBoolean(stringfiedRepresentation === objectStringfiedRepresentation)
                }
            }
        } else {
            return await this.newBoolean(false)
        }
    }
    
    /**
     * If the length of the list is less than the length of whatever value you are sending to compare, then we return true
     * otherwise we return false.
     * 
     * @param {FlowObject} obj - The value to compare the length of the list with.
     * 
     * @param {import('./boolean')} - Returns true if the length of the list is less then the length of the value, 
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
     * If the length of the list is greater than the length of whatever value you are sending to compare, then we return true
     * otherwise we return false.
     * 
     * @param {FlowObject} obj - The value to compare the length of the list with.
     * 
     * @param {import('./boolean')} - Returns true if the length of the list is greater then the length of the value, 
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
     * Returns false if the list is empty, otherwise return true.
     * 
     * @returns {Promise<import('./boolean')>} - Returns true if the list is not empty, otherwise returns false.
     */
    async _boolean_() {
        return await this.newBoolean(await this.array.length() > 0)
    }

    /**
     * Retrieves the representation of the list and caches it so we don't need to retrieve it again when we need it again.
     * 
     * @returns {Promise<[]>} - Returns the representation of the list as a javascript array.
     */
    async _representation_() {
        if (this._cached.representation === null) {
            const representation = []
            for (let i = 0; i < await this.array.length(); i++) {
                const value = await this.array.getItem(i)
                await this.appendParentResetCached(value)
                representation.push(await value._representation_())
            }
            this._cached.representation = representation
        }
        return this._cached.representation
    }

    /**
     * Retrieves the json representation of the list and caches it so we don't need to retrieve it 
     * again when we need it again. The representation of the list as json is similar to the default _representation_
     * except that this returns boolean values as true and false instead of 1 and 0. It also makes some conversions
     * for example dates to string.
     * 
     * @returns {Promise<[]>} - Returns the representation of the list as json compliant with the json standard.
     */
    async _json_() {
        if (this._cached.json === null) {
            const json = []
            for (let i = 0; i < await this.array.length(); i++) {
                const value = await this.array.getItem(i)
                await this.appendParentResetCached(value)
                json.push(await value._json_())
            }
            this._cached.json = json
        }
        return this._cached.json
    }

    /**
     * Returns the representation of the list as a string, this string representation will be used in a repl so the user can
     * see what is inside of the list and so on. This is similar to what happens if the user uses console.log() on javascript
     * or print() on python.
     *
     * @param {object} options - The options object that contains the indentation number.
     * @param {number} [options.ident=4] - The indentation number. By default it is 4 spaces.
     * @param {boolean} [options.ignoreDocumentation=false] - If we should show the documentation or not.
     * 
     * @returns {Promise<import('./string')>} - Returns the representation of the list as a string.
     */
    async _string_({ident=4, ignoreDocumentation=false}={}) {
        if (this._cached.string === null) {
            const length = await this.array.length()
            if (length === 0) {
                this._cached.string = '[]'
            } else {
                let stringfiedRepresentation = `[\n`
                for (let i=0; i < length; i++) {
                    const valueAtIndex = await this.array.getItem(i)
                    await this.appendParentResetCached(valueAtIndex)
                    const stringifiedValue = await valueAtIndex._string_({ident: ident + 4, ignoreDocumentation: true})
                    const valueRepresentation = await stringifiedValue._representation_()

                    stringfiedRepresentation = stringfiedRepresentation + ` `.repeat(ident) + `${valueRepresentation}`+
                        `${i === await this.array.length() - 1 ? '': this.settings.positionalArgumentSeparator}\n`
                }
                stringfiedRepresentation = stringfiedRepresentation + `${ident-4 !== 1 ? ' '.repeat(ident-4) : ''}]`
                this._cached.string = stringfiedRepresentation
            }
        }
        if (ignoreDocumentation === true) {
            return await this.newString(this._cached.string)
        } else {
            return await this.appendDocumentationOnStringRepresentation(this._cached.string)
        }
    }

    /**
     * Returns the length of the list as an integer.
     * 
     * @returns {Promise<import('./integer')>} - Returns the length of the list as an FlowInteger.
     */
    async _length_() {
        return await this.newInteger(await this.array.length())
    }
}

module.exports = FlowList