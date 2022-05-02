const { FlowList, FlowFunction, FlowObject, FlowString } = require('../objects')
const { LIST_TYPE } = require('../types')
const { LibraryModule } = require('./index')
const { retrieveRepresentation } = require('../../helpers/library')
const errorTypes = require('../errorTypes')


class List extends LibraryModule {
    /**
     * This function will append the index, the value and any other arguments to the function parameters.
     * This will respect the function parameters first, if the function expects 1 parameter only, we will pass only
     * the first value on the `parameters` list, if the function expects 2 parameters we will pass the first and second
     * values of the `parameters` list, and so on.
     * 
     * This respects also the ordering of the parameters and ignores completly the name the user gives to each parameter on 
     * the function.
     * 
     * @param {FlowFunction} fn - The FlowFunction to append the parameters to.
     * @param {Array<import('../objects/object')>} parameters - An array of FlowObjects to pass to the function call.
     * 
     * @returns {Promise<import('../objects/dict')>} - Returns a new FlowDict with the parameters appended.
     */
    async getParametersToFunction(fn, parameters=[]) {
        const newParameters = await this.newDict()
        let parametersLength = await (await fn.parameters._length_())._representation_()
        parametersLength = parametersLength > parameters.length ? parameters.length : parametersLength
        for (let i=0; i<parametersLength; i++) {

            if (parameters[i] !== undefined) {
                const rawKey = await fn.parameters.hashTable.rawKeys.getItem(i)
                const value = parameters[i]
                await newParameters._setitem_(rawKey, value)
            }
        }
        return newParameters
    }

    methods = {
        /**
         * Checks if a given item is a FlowList.
         * 
         * @param {object} params - The parameters to the `isList` function.
         * @param {import('../objects/object')} params.item - The item to check if it's a list
         * 
         * @returns {import('../objects/boolean')} - Returns a FlowBoolean with the result if it's a list or not.
         */
        isList: async({list} = {}) => {
            if (list && list.type === LIST_TYPE) {
                return this.newBoolean(true)
            } else {
                return this.newBoolean(false)
            }
        },
        /**
         * Creates a new flowList from the numbers from the `start` to `end` in a given number of `steps`.
         * This will enable you to create lists easily without a hassle.
         * 
         * @param {object} params - The parameters for the `createRange` function.
         * @param {import('../objects/number')} params.start - The start of the range.
         * @param {import('../objects/number')} params.end - The end of the range.
         * @param {import('../objects/number')} params.steps - The number of steps to take. Defaults to 1. Also cannot be 0.
         * 
         * @returns {import('../objects/list')} - Returns a FlowList with the numbers from the `start` to `end` in a given number of `steps`.
         */
        createRange: async({start, end, steps=1} = {}) => {
            start = await retrieveRepresentation(start)
            end = await retrieveRepresentation(end)
            steps = await retrieveRepresentation(steps)
            if (typeof start === 'number' && typeof end === 'number' && typeof steps === 'number' && steps !== 0) {
                const list = await this.newList()
                if (steps > 0) {
                    for (let i = start; i < end; i+=steps) {
                        await list.array.append(this.newInteger(i))
                    }       
                } else {
                    for (let i = start; i > end; i+=steps) {
                        await list.array.append(this.newInteger(i))
                    }
                }
                return list
            } else {
                await this.newError(errorTypes.INVALID_ARGUMENT, `'${this.parametersContextForFunctions['createRange'][0]}', '${this.parametersContextForFunctions['createRange'][1]}' and '${this.parametersContextForFunctions['createRange'][2]}' `+
                `must be numbers and '${this.parametersContextForFunctions['createRange'][2]}' must be different than 0`)
            }
        },
        /**
         * Returns the length of a given FlowObject, usually will be used in conjunction with lists.
         * 
         * @param {object} params - The parameters for the `length` function.
         * @param {import('../objects/object')} params.object - The object to get the length of.
         * 
         * @returns {import('../objects/number')} - Returns a FlowNumber with the length of the given object.
         */
        length: async({list} = {}) => {
            if (list instanceof FlowObject) {
                return list._length_()
            } else {
                await this.newError(errorTypes.TYPE, 'Invalid argument passed to length function')
            }
        },
        /**
         * Appends a value to the list. It will append the value in place, this means that the original list passed will change
         * we will not create a new list.
         * 
         * @param {object} params - The parameters to append the value to the list.
         * @param {import('../objects/list')} params.list - The list to append the value to.
         * @param {import('../objects/object')} params.value - Any value can be inserted in the list a list is an array of FlowObjects.
         * So this means any FlowObject is valid.
         * 
         * @returns {import('../objects/list')} - Returns the list with the value appended. This is the original list passed.
         */
        append: async({list, value} = {}) => {
            if (list && list.type === LIST_TYPE) {
                await list.array.append(value)
                return list
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['append'][0]}' should be a list.`)
            }
        },
        /**
         * Will filter the list and return a new list with the values that match the given condition.
         * Should return a boolean operation.
         * 
         * @param {object} params - The parameters to filter the list.
         * @param {import('../objects/list')} params.list - The list to filter.
         * @param {import('../objects/function')} params.fn - The function to be used to filter the list.
         * 
         * @returns {import('../objects/list')} - Returns a new list with the values that match the given condition.
         */
        filter: async({list, fn} = {}) => {
            if (list instanceof FlowList && fn instanceof FlowFunction) {
                const newList = await this.newList() 
                const listLength = await (await list._length_())._representation_()
                for (let i=0; i < listLength; i++) {
                    const index = await this.conversorHelper.javascriptValueToFlowObject(i)
                    const value = await list.array.getItem(i)
                    const parameters = await this.getParametersToFunction(fn, [value, index])
                    const result = await fn._call_(parameters)
                    if (await (await result._boolean_())._representation_() === 1) {
                        await newList.array.append(value)
                    }
                }
                return newList
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['filter'][0]}' should be a list and '${this.parametersContextForFunctions['filter'][1]}' should be a function`)
            }
        },
        /**
         * This will loop through all of the values of the list and call a function, instead of map that we return a new list, here we 
         * will always return None. Because this function is just for passing through all of the elements of the list.
         * 
         * @param {object} params - The parameters to the `forEach` function.
         * @param {import('../objects/list')} params.list - The list to loop through.
         * @param {import('../objects/function')} params.fn - The function to call for each element of the list.
         * 
         * @returns {import('../objects/none')} - Returns a FlowNone.
         */
        forEach: async({list, fn} = {}) => {
            if (list instanceof FlowList && fn instanceof FlowFunction) {
                const listLength = await (await list._length_())._representation_()
                for (let i=0; i < listLength; i++) {
                    const index = await this.conversorHelper.javascriptValueToFlowObject(i)
                    const value = await list.array.getItem(i)
                    const parameters = await this.getParametersToFunction(fn, [value, index])
                    await fn._call_(parameters)
                }
                return await this.newNull()
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['forEach'][0]}' should be a list and '${this.parametersContextForFunctions['forEach'][1]}' should be a function`)
            }
        },
        /**
         * Iterates over a list and returns a new list with the values returned from the given function. The function
         * will be called on each element.
         * 
         * @param {object} param - The parameters the `map` function recieves.
         * @param {import('../objects/list')} param.list - Expects a FlowList to iterate over.
         * @param {import('../objects/function')} param.function - Expects a FlowFunction to call on each item of the list.
         * 
         * @returns {import('../objects/list')} - Returns a new FlowList with the values returned from the function.
         */
        map: async({list, fn} = {}) => {
            if (list instanceof FlowList && fn instanceof FlowFunction) {
                const newList = await this.newList() 
                const listLength = await (await list._length_())._representation_()
                for (let i=0; i < listLength; i++) {
                    const index = await this.conversorHelper.javascriptValueToFlowObject(i)
                    const value = await list.array.getItem(i)
                    const parameters = await this.getParametersToFunction(fn, [value, index])
                    const result = await fn._call_(parameters)
                    await newList.array.append(result)
                }
                return newList
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['map'][0]}' should be a list and '${this.parametersContextForFunctions['map'][1]}' should be a function`)
            }
        },
        /**
         * Joins a list into a string with a given separator. By default the separator is an empty string, this means every word will
         * be concatenated together. If you want to join for example to show the comma separated values, just use '; ' as the separator.
         * THis can be useful for creating CSV or other values.
         * 
         * @param {object} param - The parameters the `join` function recieves.
         * @param {import('../objects/list')} param.list - Expects a FlowList to iterate over.
         * @param {import('../objects/string')} param.separator - Expects a FlowString to use as a separator. Defaults to '' (empty string).
         * 
         * @returns {import('../objects/string')} - Returns a new FlowString with the values joined together.
         */
        join: async({list, separator=''} = {}) => {
            if (list instanceof FlowList && separator instanceof FlowString) {
                separator = await retrieveRepresentation(separator)
                const listLength = await (await list._length_())._representation_()
                let result = ''
                for (let i=0; i < listLength; i++) {
                    const value = await list.array.getItem(i)
                    if (value instanceof FlowString) result += await value._representation_()
                    else result += await (await value._string_())._representation_()
                    
                    if (i < listLength - 1) result += separator
                }
                return await this.newString(result)
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['join'][0]}' should be a list.`)
            }
        }
    }

    static async documentation() {

    }
}

module.exports = List