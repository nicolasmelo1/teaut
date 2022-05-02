const { LibraryModule } = require('.')
const { retrieveRepresentation } = require('../../helpers/library')
const errorTypes = require('../errorTypes')
const { FlowFunction, FlowObject, FlowString } = require('../objects')


class Function_ extends LibraryModule {
    methods = {
        /**
         * Changes if a given value is a function, if it is then we return a FlowBoolean as True, otherwise return as False.
         * 
         * @param {object} params - The parameters of the `isFunction` function.
         * @param {FlowObject} params.value - The value to check if it is a function.
         * 
         * @param {Promise<import('../objects/boolean')>} - A FlowBoolean as True if the value is a function, otherwise False.
         */
        isFunction: async ({ value } = {}) => {
            return await this.newBoolean(value instanceof FlowFunction)
        },
        /**
         * Returns the function as a string.
         * 
         * @param {object} params - The parameters for the `toString` function.
         * @param {FlowFunction} params.fn - The function to convert to a string.
         * 
         * @returns {Promise<import('../objects/string')>} - The result of the `toString` function is a FlowString.
         */
        toString: async ({ fn } = {}) => {
            return await fn._string_()
        },
        /**
         * Returns a dict containing the parameters of the function so this means you can literally override the parameters the function
         * recieves, i don't know why you would want to do this but it can be done.
         * 
         * @param {object} params - The parameters of the `parameters` function.
         * @param {FlowFunction} params.fn - The function to get the parameters of.
         * 
         * @param {Promise<import('../objects/dict')>} - A FlowDict containing the parameters of the function. If you make changes to this dict
         * this will reflect on the function.
         */
        parameters: async({ fn } = {}) => {
            if (fn instanceof FlowFunction) {
                return fn.parameters  
            } else {
                await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['parameters'][0]} needs to be a function.`)
            }
        },
        /**
         * Adds a new parameter to the function and return a function. You can literally add parameters to the function and then call it as if they were
         * defined in the function itself, for example:
         * 
         * ```
         * function sum() do
         *      a + b
         * end
         * 
         * Function.add_parameter(sum, "a")
         * Function.add_parameter(sum, "b")
         * 
         * sum(1, 2)
         * ```
         * 
         * The parameter added by this function will be obligatory, if you want to make it optional you can add the parameter with 
         * `addParameterWithDefaultValue` function.
         * 
         * @param {object} params - The parameters of the `addParameter` function.
         * @param {FlowFunction} params.fn - The function to add a parameter to.
         * @param {string} params.name - The name of the parameter to add. Should be a string.
         * 
         * @returns {Promise<FlowFunction>} - The fn function with the parameter added.
         */
        addParameter: async({ fn, name } = {}) => {
            if (fn instanceof FlowFunction && name instanceof FlowString) {
                await fn.parameters._setitem_(name, await FlowObject.new(this.settings))
                return fn
            } else {
                if (!fn instanceof FlowFunction) await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['addParameter'][0]} needs to be a function.`)
                if (!name instanceof FlowString) await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['addParameter'][1]} needs to be a string.`)
            }
        },
        /**
         * Similar to ``addParameter`` but this function allows you to add a parameter with a default value.
         * This means the parameter will be optional when calling the function.
         * 
         * @param {object} params - The parameters of the `addParameterWithDefaultValue` function.
         * @param {FlowFunction} params.fn - The function to add a parameter to.
         * @param {string} params.name - The name of the parameter to add. Should be a string.
         * @param {FlowObject} params.defaultValue - The default value of the parameter.
         */
        addParameterWithDefaultValue: async({ fn, name, value } = {}) => {
            if (fn instanceof FlowFunction && name instanceof FlowString && value instanceof FlowObject) {
                await fn.parameters._setitem_(name, value)
                return fn
            } else {
                if (!fn instanceof FlowFunction) await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['addParameterWithDefaultValue'][0]} needs to be a function.`)
                if (!name instanceof FlowString) await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['addParameterWithDefaultValue'][1]} needs to be a string.`)
            }
        },
        /**
         * Sometimes you define lambda functions, but some time you want to name it to something else. This will enable you to rename the function to
         * a new name, for example:
         * 
         * ```
         * module MyModule
         * 
         * MyModule.sum = Function.rename(function (a, b) do 
         *     a + b
         * end, "sum")
         * ```
         * 
         * Why would you define it like this? Because if you didn't do this you would do this
         * 
         * ```
         * module MyModule
         * 
         * MyModule.sum = function (a, b) do
         *    a + b
         * end
         * ```
         * 
         * The problem with this approach is that the function will be named <lambda>, so it doesn't have a name. Which might not be ideal
         * for some use cases.
         * 
         * If you define it like this:
         * ```
         * module MyModule
         * 
         * MyModule.sum = function sum(a, b) do
         *      a + b
         * end
         * 
         * sum(1, 2) -> sum will be defined in the scope. We generally don't want that.
         * ```
         * 
         * So what this does is give a name to the function without defining it in the scope. Be aware that this changes the original function, it does not
         * affect the scope but might affect tail call optimizations.
         * 
         * @param {object} params - The parameters of the `rename` function.
         * @param {FlowFunction} fn - The function that will be renamed.
         * @param {import('../objects/string')} name - The new name of the function.
         * 
         * @param {Promise<import('../objects/function')>} - The function renamed, this will not affect the record, this means the same name it was before will be available 
         * in memory, this only affects the function name.
         */
        rename: async({ fn, name } = {}) => {
            if (fn instanceof FlowFunction && name instanceof FlowString) {
                name = await retrieveRepresentation(name)
                fn.functionName = name
                return fn
            } else {
                if (!fn instanceof FlowFunction) await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['rename'][0]} needs to be a function.`)
                if (!name instanceof FlowString) await this.newError(errorTypes.TYPE, `${this.parametersContextForFunctions['rename'][1]} needs to be a string.`)
            }
        }
    }

    static async documentation() {

    }
}

module.exports = Function_