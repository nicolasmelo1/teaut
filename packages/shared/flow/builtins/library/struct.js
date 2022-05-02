const { LibraryModule } = require(".")
const { FlowStruct, FlowString } = require("../objects")


class Struct extends LibraryModule {
    methods = {
        /**
         * Checks if a given value is a struct object.
         * 
         * @param {object} params - The parameters of the `isStruct` function.
         * @param {FlowStruct} params.value - The value to check if it's a struct or not.
         * 
         * @returns {Promise<import('../objects/boolean')>} - A FlowBoolean that represents `true` if the value is a struct, `false` otherwise.
         */
        isStruct: async({ value } = {}) => {
            return await this.newBoolean(value instanceof FlowStruct)
        },
        /**
         * This will add a new struct attribute to the struct with a given value.
         * 
         * Example:
         * ```
         * module Teste(a, b) 
         * 
         * teste = Teste{1, 2}
         * 
         * Struct.add_attribute(teste, "c", 3)
         * 
         * teste.c == 3
         * teste.a == 1
         * teste.b == 2
         * 
         * # or we can modify the existing value in the struct.
         * 
         * Struct.add_attribute(teste, "a", 10)
         * 
         * teste.a == 10
         * ```
         * 
         * @param {object} params - The parameters for `addAttribute` function.
         * @param {FlowStruct} params.struct - The struct to add the struct parameter to.
         * @param {import('../objects/string')} params.name - The name of the struct parameter to add. Should be a string.
         * @param {import('../objects/object')} params.value - The value to add as the attribute in the struct attribute.
         * 
         * @returns {Promise<import('../objects/object')>} - Returns a promise that evaluates to a the added value.
         */
        addAttribute: async({ struct, name, value } = {}) => {
            if (struct instanceof FlowStruct && name instanceof FlowString) {
                return await struct.parameters._setitem_(name, value)
            } else {
                if (!(struct instanceof FlowStruct)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['addAttribute'][0]}' to be a struct, got ${struct.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['addAttribute'][1]}' to be a string, got ${name.type}`)
            }
        },
        /**
         * Removes a struct attribute from the struct so the attribute will not exist anymore in the given struct.
         * 
         * @param {object} params - The parameters for `removeAttribute` function.
         * @param {FlowModule} params.struct - The struct to remove the attribute from.
         * @param {import('../objects/string')} params.name - The name of the struct attribute to remove. Should be a string.
         * 
         * @returns {Promise<import('../objects/struct')>} - Returns a promise that evaluates to a struct.
         */
        removeAttribute: async({ struct, name } = {}) => {
            if (struct instanceof FlowStruct && name instanceof FlowString) {
                // The below code was copied from the FlowDict class `_subtract_` method
                const objectString = await name._string_()
                const key = await objectString._representation_()
                if (struct.parameters.hashTable.keys.array.includes(key)) {
                    const hashInteger = await name._hash_()
                    const hash = await hashInteger._representation_()
                    await struct.parameters.hashTable.remove(hash, key)
                    //await struct.parameters.resetCached()
                }
                return struct
            } else {
                if (!(struct instanceof FlowStruct)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['removeAttribute'][0]}' to be a module, got ${moduleObj.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['removeAttribute'][1]}' to be a string, got ${name.type}`)
            }
        },
    }

    static async documentation() {
        
    }
}

module.exports = Struct