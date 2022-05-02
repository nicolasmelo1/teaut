const { LibraryModule } = require(".")
const errorTypes = require("../errorTypes")
const { FlowModule, FlowObject, FlowString } = require("../objects")


class Module extends LibraryModule {
    methods = {
        /**
         * Checks if a given value is a module or not.
         * 
         * @param {object} params - The parameters for `isModule` function.
         * @param {object} params.value - The value to check if it's a module or not.
         * 
         * @returns {Promise<import('../objects/boolean')>} - Returns a promise that evaluates to a FlowBoolean object.
         */
        isModule: async ({ value } = {}) => {
            return await this.newBoolean(value instanceof FlowModule)
        },
        /**
         * Checks if a given value is a builtin module or not. This is like the `isModule` function, except that it only checks for builtin modules.
         * 
         * @param {object} params - The parameters for `isBuiltinModule` function.
         * @param {object} params.value - The value to check if it's a builtin module or not.
         * 
         * @returns {Promise<import('../objects/boolean')>} - Returns a promise that evaluates to a FlowBoolean object.
         */
        isBuiltinModule: async ({ value } = {}) => {
            return await this.newBoolean(value instanceof LibraryModule)
        },
        /**
         * Adds a new attribute to the module. This is a function for the language builtin: 
         * ```
         * module.new_attribute = 1
         * ```
         * 
         * This way we will be able to assign a value to the module without needing to use this syntax, so instead we will use:
         * ```
         * Module.add(module, "new_attribute", 1)
         * ```
         * 
         * @param {object} params - The parameters for `add` function.
         * @param {FlowModule} params.moduleObj - The module to add the attribute to.
         * @param {import('../objects/string')} params.name - The name of the attribute to add. Should be a string.
         * @param {import('../objects/object')} params.value - The value of the attribute to add.
         * 
         * @returns {Promise<import('../objects/object')>} - Returns a promise that evaluates to the value added
         */
        add: async({ moduleObj, name, value} = {}) => {
            if (moduleObj instanceof FlowModule && name instanceof FlowString && value instanceof FlowObject) {
                return await moduleObj._setattribute_(name, value)
            } else {
                if (!(moduleObj instanceof FlowModule)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['add'][0]}' to be a module, got ${moduleObj.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['add'][1]}' to be a string, got ${name.type}`)
            }
        },
        /**
         * Kinda the same as `add`, except this will get the attribute from the module. This way you can get the attributes from a module programatically without
         * need to rely only on getting statically.
         * 
         * Example:
         * ```
         * # instead of:
         * 
         * module.attribute 
         * 
         * # we can do:
         * 
         * Module.get(module, "attribute")
         * ```
         * 
         * @param {object} params - The parameters for `get` function.
         * @param {FlowModule} params.moduleObj - The module to get the attribute from.
         * @param {import('../objects/string')} params.name - The name of the attribute to get. Should be a string.
         * 
         * @returns {Promise<import('../objects/object')>} - Returns a promise that evaluates to the value of the attribute.
         */
        get: async({ moduleObj, name } = {}) => {
            if (moduleObj instanceof FlowModule && name instanceof FlowString) {
                return await moduleObj._getattribute_(name)
            } else {
                if (!(moduleObj instanceof FlowModule)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['get'][0]}' to be a module, got ${moduleObj.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['get'][1]}' to be a string, got ${name.type}`)
            }
        },
        /**
         * Checks if a module can create structs or not, and returns a boolean if yes or not.
         * 
         * Example:
         * ```
         * module CanCreateStructs(a, b)
         * module CannotCreateStructs do
         *      function sum(a, b) do
         *          a + b
         *      end
         * end
         * 
         * Module.can_create_structs(CanCreateStructs) == True
         * Module.can_create_structs(CannotCreateStructs) == False
         * ```
         * 
         * @param {object} params - The parameters for `canCreateStructs` function.
         * @param {FlowModule} params.moduleObj - The module to check if it can create structs or not.
         * 
         * @returns {Promise<import('../objects/boolean')>} - Returns a promise that evaluates to a FlowBoolean object.
         */
        canCreateStructs: async({ moduleObj } = {}) => {
            return await this.newBoolean(moduleObj instanceof FlowModule && moduleObj.doesModuleCanCreateStructs)
        },
        /**
         * This will override the behaviour of the module making it extremely dynamic. This will add a new struct parameter to the module, even if
         * the module cannot create structs. This will enable the module that cannot create structs so it can.
         * 
         * Example:
         * ```
         * module CannotCreateStructs do
         *      function sum(a, b) do
         *          a + b
         *      end
         * end
         * 
         * CannotCreateStructs{} # this will throw an error
         * 
         * Module.add_struct_parameter(CannotCreateStructs, "a")
         * 
         * CannotCreateStructs{a=1} # this will work now
         * ```
         * 
         * @param {object} params - The parameters for `addStructParameter` function.
         * @param {FlowModule} params.moduleObj - The module to add the struct parameter to.
         * @param {import('../objects/string')} params.name - The name of the struct parameter to add. Should be a string.
         * 
         * @returns {Promise<import('../objects/object')>} - Returns a promise that evaluates to a FlowObject.
         */
        addStructParameter: async({ moduleObj, name } = {}) => {
            if (moduleObj instanceof FlowModule && name instanceof FlowString) {
                if (!moduleObj.doesModuleCanCreateStructs) {
                    const newStructParameters = await this.newDict()
                    moduleObj.doesModuleCanCreateStructs = true
                    moduleObj.structParameters = newStructParameters
                }
                return await moduleObj.structParameters._setitem_(name, await FlowObject.new(this.settings))
            } else {
                if (!(moduleObj instanceof FlowModule)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['addStructParameter'][0]}' to be a module, got ${moduleObj.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['addStructParameter'][1]}' to be a string, got ${name.type}`)
            }
        },
        /**
         * Similar to `addStructParameter`, this will add a new struct parameter to the module, but this will add the parameter with a default given value.
         * 
         * Example:
         * ```
         *  module CannotCreateStructs do
         *      function sum(a, b) do
         *          a + b
         *      end
         * end
         * 
         * CannotCreateStructs{} # this will throw an error
         * 
         * Module.add_struct_parameter_with_default_value(CannotCreateStructs, "a", 1)
         * 
         * CannotCreateStructs{} == CannotCreateStructs{a=1}
         * ```
         * 
         * @param {object} params - The parameters for `addStructParameterWithDefaultValue` function.
         * @param {FlowModule} params.moduleObj - The module to add the struct parameter to.
         * @param {import('../objects/string')} params.name - The name of the struct parameter to add. Should be a string.
         * @param {import('../objects/object')} params.defaultValue - The default value to add as the attribute in the struct parameter.
         * 
         * @returns {Promise<import('../objects/object')>} - Returns a promise that evaluates to a the added defaultValue.
         */
        addStructParameterWithDefaultValue: async({ moduleObj, name, defaultValue } = {}) => {
            if (moduleObj instanceof FlowModule && name instanceof FlowString) {
                if (!moduleObj.doesModuleCanCreateStructs) {
                    const newStructParameters = await this.newDict()
                    moduleObj.doesModuleCanCreateStructs = true
                    moduleObj.structParameters = newStructParameters
                }
                return await moduleObj.structParameters._setitem_(name, defaultValue)
            } else {
                if (!(moduleObj instanceof FlowModule)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['addStructParameterWithDefaultValue'][0]}' to be a module, got ${moduleObj.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['addStructParameterWithDefaultValue'][1]}' to be a string, got ${name.type}`)
            }
        },
        /**
         * Removes a struct parameter from the module so the parameter is not accepted anymore by the struct.
         * 
         * @param {object} params - The parameters for `removeStructParameter` function.
         * @param {FlowModule} params.moduleObj - The module to remove the struct parameter from.
         * @param {import('../objects/string')} params.name - The name of the struct parameter to remove. Should be a string.
         * 
         * @returns {Promise<import('../objects/module')>} - Returns a promise that evaluates to a FlowModule.
         */
        removeStructParameter: async({ moduleObj, name } = {}) => {
            if (moduleObj instanceof FlowModule && name instanceof FlowString) {
                if (moduleObj.doesModuleCanCreateStructs === true) {
                    // The below code was copied from the FlowDict class `_subtract_` method
                    const objectString = await name._string_()
                    const key = await objectString._representation_()
                    if (moduleObj.structParameters.hashTable.keys.array.includes(key)) {
                        const hashInteger = await name._hash_()
                        const hash = await hashInteger._representation_()
                        await moduleObj.structParameters.hashTable.remove(hash, key)
                        await moduleObj.structParameters.resetCached()
                    }
                }
                return moduleObj
            } else {
                if (!(moduleObj instanceof FlowModule)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['removeStructParameter'][0]}' to be a module, got ${moduleObj.type}`)
                if (!(name instanceof FlowString)) await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['removeStructParameter'][1]}' to be a string, got ${name.type}`)
            }
        },
        /**
         * This is here to override the default behaviour of a module. As you might already know, the structParameters of a module can be either FlowNull or 
         * FlowDict. If it is a FlowNull this means we cannot create structs, if it's a FlowDict we can for example append new values to this structParameters and that
         * will enable us to change how the struct can be created from a module dynamically. This will allow us to dynamically change how a module
         * can create structs in runtime so one module will be able to create many structs. For example, when creating a ORM, we might want to create a the structs
         * that represent the data as the same module. I know, i know, ORM is too much for a Low-Code programming language, but hey, at least we can do it.
         * 
         * Example:
         * ```
         * module CanCreateStructs(a, b)
         * 
         * can_create_structs_struct_parameters = Module.struct_parameters(CanCreateStructs)
         * 
         * can_create_structs_struct_parameters['c'] = 2
         * 
         * CanCreateStructs{a=1, b=2} == CanCreateStructs{a=1, b=2, c=2}
         * ```
         * 
         * @param {object} params - The parameters for `structParameters` function.
         * @param {FlowModule} params.moduleObj - The module to get the struct parameters from.
         * 
         * @returns {Promise<import('../objects/dict') | import('../objects/null')>} - Returns a promise that evaluates to a FlowDict or FlowNull.
         */
        structParameters: async({ moduleObj } = {}) => {
            if (moduleObj instanceof FlowModule) {
                return await moduleObj.structParameters
            } else {
                await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['structParameters'][0]}' to be a module, got ${moduleObj.type}`)
            }
        },
        /**
         * Returns all of the attributes of a module. Same as the `structParameters`, this will return a FlowDict, this FlowDict will have all
         * of the functions, variables or other modules that this module has.
         * 
         * Example:
         * ```
         * Module.attributes(Module) == {
         *      "attributes": function ...,
         *      "struct_parameters": function ...,
         *      "add_struct_parameter_with_default_value": function ...,
         *      "add_struct_parameter": function ...,
         *      "can_create_structs": function ...,
         *      ...
         * }
         * ```
         * 
         * @param {object} params - The parameters for `attributes` function.
         * @param {FlowModule} params.moduleObj - The module to get the attributes from.
         * 
         * @returns {Promise<import('../objects/dict')>} - Returns a promise that evaluates to a FlowDict with the functions, attributes and variables of a module.
         */
        attributes: async({ moduleObj } = {}) => {
            if (moduleObj instanceof FlowModule) {
                return await moduleObj.attributes
            } else {
                await this.newError(errorTypes.TYPE, `Expected '${this.parametersContextForFunctions['attributes'][0]}' to be a module, got ${moduleObj.type}`)
            }
        }
    }

    static async documentation() {
        
    }
}

module.exports = Module