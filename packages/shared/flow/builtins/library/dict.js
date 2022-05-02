const { DICT_TYPE } = require('../types')
const { LibraryModule } = require('./index')
const errorTypes = require('../errorTypes')
const { FlowDict } = require('../objects')


class Dict extends LibraryModule {
    methods = {
        /**
         * Checks if a given value is a dictionary.
         * 
         * @param {object} params - The parameters of the `isDict` function.
         * @param {import('../objects/object')} - Any flow object that you want to check if it's a dictionary.
         * 
         * @returns {Promise<import('../objects/boolean')>} - `true` if the object is a dictionary, `false` otherwise.
         */
        isDict: async ({ dict } = {}) => {
            return this.newBoolean(dict instanceof FlowDict)
        },
        /**
         * Returns the length of the dictionary. In other words, this is the number of items that exist in the dictionary.
         * 
         * @param {object} params - The parameters for the `length` method.
         * @param {object} params.dict - The dictionary to get the length of.
         * 
         * @returns {Promise<number>} - The length of the dictionary.
         */
        length: async ({ dict } = {}) => {
            if (dict && dict.type === DICT_TYPE) {
                return await dict._length_()
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['length'][0]}' parameter should be a dict.`)
            }
        },
        /**
         * Retrieves the keys from the given dict. You will notice that we don't retrieve the keys directly, instead we create
         * a new list, that's because if we made changes to the keys list we would make changes to the dict as well.
         * 
         * @param {object} params - The params recieved by the `keys` function.
         * @param {import('../objects/dict')} params.dict - The dict to retrieve the keys from.
         * 
         * @returns {Promise<import('../objects/list')>} - The list of keys.
         */
        keys: async ({ dict } = {}) => {
            if (dict && dict.type === DICT_TYPE) {
                const list = await this.newList()
                for (let i=0; i< dict.hashTable.rawKeys.numberOfElements; i++) {
                    await list.array.append(await dict.hashTable.rawKeys.getItem(i))
                }
                return list
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['keys'][0]}' parameter should be a dict.`)
            }
        },
        /**
         * Retrieves the values that exists inside of the dictionary. If `keys` return the keys, this will return all of the values only.
         * 
         * @param {object} params - The params recieved by the `values` function.
         * @param {import('../objects/dict')} params.dict - The dict to retrieve the values from.
         * 
         * @returns {Promise<import('../objects/list')>} - The list of values inside of the dict.
         */
        values: async ({ dict } = {}) => {
            if (dict && dict.type === DICT_TYPE) {
                const list = await this.newList()
                for (let i=0; i< dict.hashTable.values.numberOfElements; i++) {
                    await list.array.append(await dict.hashTable.values.getItem(i))
                }
                return list
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['values'][0]}' parameter should be a dict.`)
            }
        },
        /**
         * This function will return the keys and values of the given dict combined in a 2d array. This will be like this:
         * `[[key1, value1], [key2, value2], ...]`
         * 
         * @param {object} params - The params recieved by the `items` function.
         * @param {import('../objects/dict')} params.dict - The dict to retrieve the items from.
         * 
         * @returns {Promise<import('../objects/list')>} - The list of items inside of the dict.
         */
        items: async ({ dict } = {}) => {
            if (dict && dict.type === DICT_TYPE) {
                const list = await this.newList()
                for (let i=0; i< dict.hashTable.rawKeys.numberOfElements; i++) {
                    const rawKey = await dict.hashTable.rawKeys.getItem(i)
                    const value = await dict.hashTable.values.getItem(i)
                    const entry = await this.newList([rawKey, value])
                    await list.array.append(entry)
                }
                return list
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['items'][0]}' parameter should be a dict.`)
            }
        },
        /**
         * Deletes a given key from the dict only if it exists, if it does not exist we will not delete anything.
         * 
         * @param {object} params - The params recieved by the `delete` function.
         * @param {import('../objects/dict')} params.dict - The dict to delete the key from.
         * @param {import('../objects/object')} params.key - The key to delete from the dict.
         * 
         * @returns {import('../objects/dict')} - The dict with the key deleted.
         */
        delete: async ({ dict, key } = {}) => {
            if (dict && dict.type === DICT_TYPE) {
                key = await key._representation_()
                if (dict.hashTable.keys.array.includes(key)) {
                    const hashInteger = await key._hash_()
                    const hash = await hashInteger._representation_()
                    dict.hashTable.remove(hash, key)
                }
                return dict
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['delete'][0]}' parameter should be a dict.`)
            }
        }
    }

    static async documentation() {
        
    }
}

module.exports = Dict