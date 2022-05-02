/** @module src/formula/utils/builtin/objects/dict */

const FlowObject = require('./object')
const { DICT_TYPE } = require('../types')
const errorTypes = require('../errorTypes')
const { HashMapHelper } = require('../../helpers')

/**
 * A dict in flow is similar to a object in javascript but it is more similar to a python dict than to a javascript object.
 * 
 * In the flowDict you generally use strings as keys. On javascript you will use variables that will be converted to strings
 * in the hashmap.
 * 
 * So to have a better understanding of how this works we recommend understanding how python's dict works.
 * 
 * Also you might want to take a look at the HashMapHelper class to understand how the hashmap works and how it was implemented
 * to support stuff like the FlowDict.
 * 
 * Be aware that this object uses `.appendParentResetCached()` and `.resetCached()` functions from the parent object.
 * Both functions are used to reset the cached representation of the dict/list so we do not need to build it everytime.
 */
class FlowDict extends FlowObject {
    constructor(settings) {
        super(settings, DICT_TYPE)
    }
    
    /**
     * Factory method for creating a new FlowDict without needing to initialize it everytime.
     * 
     * @param {import('../../settings').Settings} settings - The settings object
     * in flow for the context.
     * @param {Array<[FlowObject, FlowObject]>} keysAndValues - An array of values to be inserted in the dict.
     * This is an array of arrays, the first item inside the inner array is the key and the second item is the value.
     * 
     * @returns {Promise<FlowDict>} - Returns the dict with the values inserted.
     */
    static async new(settings, keysAndValues=[]) {
        return await (new FlowDict(settings))._initialize_(keysAndValues)
    }

    /**
     * 
     * @param {Array<[FlowObject, FlowObject]>} keysAndValues - An array of values to be inserted in the dict.
     * This is an array of arrays, the first item inside the inner array is the key and the second item is the value. 
     * 
     * @returns {Promise<FlowDict>} - Returns the dict with the values inserted.
     */
    async _initialize_(keysAndValues=[]) {
        /** @type {Array<[FlowObject, number, string, FlowObject]>}*/
        const rawKeysHashesKeysAndValues = []

        await this.resetCached()

        for (const [rawKey, value] of keysAndValues) {
            await this.appendParentResetCached(value)
            const hashInteger = await rawKey._hash_()
            const hash = await hashInteger._representation_()
            const keyString = await rawKey._string_()
            const key = await keyString._representation_()
            rawKeysHashesKeysAndValues.push([rawKey, hash, key, value])
        }
        /** @type {import('../../helpers/hashMap')} */
        this.hashTable = await HashMapHelper.initialize(rawKeysHashesKeysAndValues)
        return await super._initialize_()
    }

    /**
     * Retrieves an item from a key, from the dict. 
     * You can also chain those retrievals like ["key1"]["key2"] and so on.
     * 
     * @param {FlowObject} item - The item to be retrieved from the object.
     * 
     * @returns {Promise<FlowObject>} - Returns the item inserted at the given key.
     */
    async _getitem_(item) {
        const keyToFind = await (await item._string_())._representation_()
        if (this.hashTable.keys.array.includes(keyToFind)) {
            const hashInteger = await item._hash_()
            const keyString = await item._string_()
            
            const hashNode = await this.hashTable.search(
                await keyString._representation_(), 
                await hashInteger._representation_()
            )

            await this.resetCached()

            return hashNode.value
        } else {
            return await super._getitem_(item)
        }
    }

    /**
     * Sets a new item in the dict, be aware the the item you try to insert should be hashable and also should 
     * return a string representation.
     * 
     * @param {FlowObject} item - The key that you want to insert the item on.
     * @param {FlowObject} value - You can store any flow object inside of the hashTable.
     * 
     * @returns {Promise<FlowObject>} - Returns the value that was inserted.
     */
    async _setitem_(item, value) {
        await this.appendParentResetCached(value)

        try {
            const hashInteger = await item._hash_()
            const keyString = await item._string_()
            const hash = await hashInteger._representation_()
            const key = await keyString._representation_()

            const result = await this.hashTable.append(item, hash, key, value)
            await this.resetCached()

            return result
        } catch (e) {
            if (e.type === errorTypes.TYPE) {
                return await super._setitem_(item, value)
            } else {
                throw(e)
            }
        }
    }

    /** 
     * When two dicts are added together, the values of the second dict are added to the first dict.
     * 
     * @param {FlowDict} dict - The dict that you want to add to the current dict.
     * 
     * @returns {Promise<FlowDict>} - Returns the dict with the values added.
     */
    async _add_(obj) {
        if (obj.type === DICT_TYPE) {
            for (let i=0; i < await obj.hashTable.keys.length(); i++) {
                const [key, rawKey, hash] = await Promise.all([
                    obj.hashTable.keys.getItem(i),
                    obj.hashTable.rawKeys.getItem(i),
                    obj.hashTable.hashes.getItem(i)
                ])
                const hashNode = await obj.hashTable.search(key, hash)
                const value = hashNode.value
                
                await Promise.all([
                    this.appendParentResetCached(value),
                    this.hashTable.append(rawKey, hash, key, value)
                ])
            }

            await this.resetCached()

            return this
        } else {
            await this.newError(errorTypes.TYPE, `A '${this.type}' can only be added to another '${this.type}'`)
        }
    }
    
    /**
     * Removes a given key from the dict.
     * 
     * @param {FlowObject} obj - The key that you want to be removed.
     * 
     * @returns {Promise<FlowDict>} - Returns the dict with the key removed.
     */
    async _subtract_(obj) {
        const objectString = await obj._string_()
        const key = await objectString._representation_()
        if (this.hashTable.keys.array.includes(key)) {
            const hashInteger = await obj._hash_()
            const hash = await hashInteger._representation_()
            await this.hashTable.remove(hash, key)

            await this.resetCached()

            return this
        } else {
            await this.newError(errorTypes.KEY, `The following '${this.type}' does not contain '${key}'`)
        }
    }

    /**
     * Checks if the given key exists in the dict.
     * 
     * @param {FlowObject} item - The key to be checked if exists.
     * 
     * @returns {Promise<import('./boolean')>} - Returns a new FlowBoolean object representing either true or false.
     */
    async _in_(obj) {
        const keyString = await obj._string_()
        const key = await keyString._representation_()
        return await this.newBoolean(this.hashTable.keys.array.includes(key))
    }

    /**
     * Checks if two dicts are equal in flow. For that we first check the length of both, then we check if the
     * JSON.stringify representation of both dicts are equal and last but not least check if the actual Flow
     * string representation is equal on both dicts. This is really similar to ```FlowList._equals_()``` function.
     * 
     * @returns {Promise<import('./boolean')>} - Returns a new FlowBoolean object representing either true or false.
     */
    async _equals_(obj) {
        if (obj.type === DICT_TYPE) {
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
     * If the length of the dict is less than the length of whatever value you are sending to compare, then we return true
     * otherwise we return false.
     * 
     * @param {FlowObject} obj - The value to compare the length of the dict with.
     * 
     * @param {Promise<import('./boolean')>} - Returns true if the length of the dict is less then the length of the value, 
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
     * If the length of the dict is greater than the length of whatever value you are sending to compare, then we return true
     * otherwise we return false.
     * 
     * @param {FlowObject} obj - The value to compare the length of the dict with.
     * 
     * @param {import('./boolean')} - Returns true if the length of the dict is greater then the length of the value, 
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
     * Returns false if the dict is empty, otherwise returns true.
     * 
     * @returns {import('./boolean')} - Returns a new FlowBoolean object representing either true or false.
     */
    async _boolean_() {
        return await this.newBoolean(await this.hashTable.length() > 0)
    }

    /**
     * Retrieves the representation of the dict in javascript. In other words retrieves it as a javascript object so we
     * can seamlessly make it work as a json request, or any other stuff.
     * 
     * @returns {Promise<object>} - Returns the representation of the dict in javascript.
     */
    async _representation_() {
        if (this._cached.representation === null) {
            let representation = {}

            for (let i=0; i < await this.hashTable.keys.length(); i++) {
                if (this.hashTable.keys.array[i] !== undefined) {
                    const [key, hash, rawKey] = await Promise.all([
                        this.hashTable.keys.getItem(i),
                        this.hashTable.hashes.getItem(i),
                        this.hashTable.rawKeys.getItem(i)
                    ])
                    const hashNode = await this.hashTable.search(key, hash)
                    const actualKeyRepresentation = await rawKey._representation_()
                    await this.appendParentResetCached(hashNode.value)
                    const jSValue = await hashNode.value._representation_()
                    representation[actualKeyRepresentation] = jSValue
                }
            }
            this._cached.representation = representation
        } 
        return this._cached.representation
    }

    /**
     * Retrieves the json representation of the dictionary. This will guarantee that stuff
     * like dates and booleans can be represented in a json object. You will see that we cache the json representation
     * so whenever we need to retrieve it again it will not need to redefine everything again.
     * 
     * @returns {Promise<object>} - Returns the json representation of the dict.
     */
    async _json_() {
        if (this._cached.json === null) {
            let json = {}

            for (let i=0; i< await this.hashTable.keys.length(); i++) {
                if (this.hashTable.keys.array[i] !== undefined) {
                    const [key, hash, rawKey] = await Promise.all([
                        this.hashTable.keys.getItem(i),
                        this.hashTable.hashes.getItem(i),
                        this.hashTable.rawKeys.getItem(i)
                    ])
                    const hashNode = await this.hashTable.search(key, hash)
                    // Retrieves the boolean as true or false, not 1 or 0 as we consider inside of flow.
                    const actualKeyRepresentation = await rawKey._json_()
                    await this.appendParentResetCached(hashNode.value)
                    const jSValue = await hashNode.value._json_()
                    json[actualKeyRepresentation] = jSValue
                }
            }
            this._cached.json = JSON.parse(JSON.stringify(json))
        } 
        return this._cached.json
    }

    /**
     * Returns the representation of the dict inside of flow giving the nested representation of the values.
     * To make it clear for the user we pass the `ident` number to the _string_() method so we can retrieve the 
     * values printed nicely with the correct indentation.
     * 
     * TODO: We can optimize the performance of this method by limiting the number of elements it will represent.
     * 
     * @param {object} options - The options object that contains the indentation number.
     * @param {number} [options.ident=4] - The indentation number. By default it is 4 spaces.
     * @param {boolean} [options.ignoreDocumentation=false] - If we should show the documentation or not.
     * 
     * @returns {Promise<import('./string')>} - Returns the representation of the dict inside of flow as a FlowString.
     */
    async _string_({ident=4, ignoreDocumentation=false}={}) {
        if (this._cached.string === null) {
            const rawKeysLength = await this.hashTable.rawKeys.length()
            if (rawKeysLength === 0) { 
                this._cached.string = '{}'
            } else {
                let stringfiedRepresentation = `{\n`
                for (let i=0; i < rawKeysLength; i++) {
                    if (this.hashTable.rawKeys.array[i] !== undefined) {
                        const rawKey = await this.hashTable.rawKeys.getItem(i)
                        const hash = await (await rawKey._hash_())._representation_()
                        const stringfiedRaw = await rawKey._string_()
                        const key = await stringfiedRaw._representation_()
                        const hashNode = await this.hashTable.search(key, hash)
                        await this.appendParentResetCached(hashNode.value)
                        const stringfiedValue = await hashNode.value._string_({ident: ident+4, ignoreDocumentation: true})
                        const value = await stringfiedValue._representation_()

                        stringfiedRepresentation = stringfiedRepresentation + ` `.repeat(ident) + `${key}: ${value}`+
                        `${i === await this.hashTable.keys.length() - 1 ? '': this.settings.positionalArgumentSeparator}\n`
                    }
                }
                stringfiedRepresentation = stringfiedRepresentation + `${ident-4 !== 1 ? ' '.repeat(ident-4) : ''}}`
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
     * Returns the length of the dict.
     * 
     * @returns {Promise<import('./integer')>} - Returns the length of the dict as a FlowInteger.
     */
    async _length_() {
        return await this.newInteger(await this.hashTable.length())
    }
}

module.exports = FlowDict