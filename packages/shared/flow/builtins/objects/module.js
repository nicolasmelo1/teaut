/** @module src/formula/utils/builtin/objects/module */

const FlowObject = require('./object')
const { MODULE_TYPE, DICT_TYPE, OBJECT_TYPE } = require('../types')
const errorTypes = require('../errorTypes')


/**
 * All modules in flow are like objects, except all of the methods and variables defined inside it are public and static. This means
 * there is no way to get an instance of a module. There is no `this` or `self` keywords. So to call a method or a variable inside of a module
 * you need to explicitly call the module.
 * 
 * Instead of:
 * ```
 * class Interpreter {
 *    constructor() {
 *       this.x = 1
 *    }
 * 
 *    awesome_method() {
 *      return this.x
 *    }
 * }
 * ``` 
 * 
 * In Flow you would write as:
 * ```
 * module Interpreter do
 *   x = 1
 * 
 *   function awesome_method() do
 *      return Interpreter.x
 *   end
 * end
 * 
 * Interpreter.awesome_method() == 1
 * ```
 * 
 * Besides that modules are also used to create structs, structs are better explained inside the `FlowStruct` and `#handleStruct()` method.
 * ```
 * module User(
 *      name, 
 *      age, 
 *      email=None
 * )
 * 
 * user = User{"John", 25}
 * 
 * user.name == "John"
 * user.email == None
 * ```
 * 
 * Not all modules can create structs, to be able to create structs you need to create a module with the open and close () brackets.
 * 
 * ```
 * module User(name, age, email=None) -> can create a struct
 * 
 * module User do -> can not create a struct
 *      ...
 * end
 * ```
 * 
 * HINT: Modules can hold special methods like _add_, _subtract_ and so on. So this enables a type of metaprogramming. This metaprogramming
 * is not like Macros of rust or elixir, but instead similar to Python dunder methods, so you can override the behaviour of the language. By 
 * using the structs.
 */
class FlowModule extends FlowObject {
    constructor(settings) {
        super(settings, MODULE_TYPE)
    }

    /**
     * Static method for initializing a new module inside of flow interpreter, so it makes easier to create modules.
     * 
     * @param {import('../../settings').Settings} settings - The settings class that will be used inside of flow.
     * @param {string} moduleName - The name of the module. If no module name is provide we will create a `<${moduleKeyword}>`
     * @param {import('./dict') | import('./null')} structParameters - The struct parameters can be either a dict or null. If it is
     * null than the module can't create structs, if it is a dict than the module can create structs.
     */
    static async new(settings, moduleName, structParameters) {
        return await (new FlowModule(settings))._initialize_(moduleName, structParameters)
    }
    
    /**
     * Initializes the module by giving the module name, scope and the structParameters if the module can be used to create structs.
     * If you look closely, attributes is just a simple dictionary. This means a module is a kind of abstract away the dictionary implementation
     * and gives more function than a simple dictionary inside of flow. In dictionaries you can't call attributes, you call the keys, on modules
     * you call attributes. Modules can create structs, dicts don't.
     * 
     * @param {string} moduleName - The name of the module. If no module name is provide we will create a `<${moduleKeyword}>`
     * @param {import('./dict') | import('./null')} structParameters - The struct parameters can be either a dict or null. If it is
     * null than the module can't create structs, if it is a dict than the module can create structs.
     * 
     * @returns {Promise<FlowModule>} - Returns an instance of the FlowModule class.
     */
    async _initialize_(moduleName, structParameters) {
        /** @type {bool} */
        this.doesModuleCanCreateStructs = structParameters.type === DICT_TYPE
        this.structParameters = structParameters
        this.moduleName = moduleName
        this.attributes = await this.newDict()
        return super._initialize_()
    }

    /**
     * Modules are not constant, we can assign new attributes to it in runtime if we want to. This way modules behaviour can be overriden,
     * although we recommend most of times not to since you will basically loose the functionality it had before.
     * 
     * But you can for example do this:
     * ```
     * module Interpreter do
     *     function evaluate() do
     *        "original function"
     *     end
     * end
     * 
     * Interpreter.original_evaluate = Interpreter.evaluate
     * 
     * Interpreter.evaluate = function() do
     *      "Hello World"
     * end
     * 
     * Interpreter.evaluate() == "Hello World"
     * Interpreter.original_evaluate() == "original function"
     * ```
     * 
     * This will keep the functionality of the module and you can safely override the original function as you want.
     * 
     * @param {import('./string')} variable - The variable that we want to assign to the module. This is always a string.
     * @param {import('./object')} value - The value that we want to assign to the variable.
     * 
     * @returns {Promise<import('./object')>} The value that was assigned to the variable.
     */
    async _setattribute_(variable, element) {
        return await this.attributes._setitem_(variable, element)
    }

    /**
     * As said before, getting attributes from modules is kinda the same as getting an instance inside of a dictionary because 
     * this.attributes is itself a dictionary. The only exception is that attribute variables will always be a string making it
     * easy to understand and debug.
     * 
     * @param {import('./string')} variable - The variable that we want to get from the module. This is always a string.
     * 
     * @returns {Promise<import('./object')>} - The value that was assigned to the variable if it exsits.
     */
    async _getattribute_(variable) {
        const keyToFind = await (await variable._string_())._representation_()

        if (this.attributes.hashTable.keys.array.includes(keyToFind)) {
            return await this.attributes._getitem_(variable)
        } else {
            await this.newError(errorTypes.ATTRIBUTE, `Attribute ${await (await variable._string_())._representation_()} doesn't exist in module '${this.moduleName}'.`)
        }
    }
    
    /**
     * We will print the module to the user like this:
     * 
     * ```
     * module StructCreator(a, b, c=1)
     * 
     * module AttributesOnly do
     *      function hello() do
     *          "Hello"
     *      end
     * end
     * 
     * module AttributesAndFunctions(a, b) do
     *     function hello() do
     *        "Hello"
     *    end
     * end
     * ```
     * 
     * StructCreator will print as:
     * <module StructCreator (a, b, c=1)>
     * 
     * AttributesOnly will print as:
     * <module AttributesOnly attributes={
     *    hello: <function hello>
     * }>
     * 
     * AttributesAndFunctions will print as:
     * <module AttributesAndFunctions (a, b) attributes={
     *   hello: <function hello>
     * }>
     * 
     * @param {object} options - The options object that contains the indentation number and other data for the print function.
     * @param {number} [options.ident=4] - The indentation number. By default it is 4 spaces.
     * @param {bool} [options.ignoreDocumentation=false] - If we should show the documentation or not.
     * 
     * @returns {Promise<import('./string')>} - Returns the string representation of the module.
     */
    async _string_({ident=4, ignoreDocumentation=false} = {}) {
        const getStructParametersRepresentation = async () => {
            if (this.doesModuleCanCreateStructs === true) {
                let stringfiedRepresentationOfStructParameters = ``
                for (let i=0; i < this.structParameters.hashTable.keys.numberOfElements; i++) {
                    if (this.structParameters.hashTable.keys.array[i] !== undefined) {
                        const rawKey = await this.structParameters.hashTable.rawKeys.getItem(i)
                        const rawValue = await this.structParameters._getitem_(rawKey)
                        const stringfiedValue = await rawValue._string_({ignoreDocumentation: true})
                        const value = await stringfiedValue._representation_()
                        
                        const isLastItemInDict = await (await this.structParameters._length_())._representation_() - 1 === i
                        if (rawValue.type !== OBJECT_TYPE) {
                            stringfiedRepresentationOfStructParameters = stringfiedRepresentationOfStructParameters + ` ${await rawKey._representation_()}=${value}`+
                            `${isLastItemInDict ? ' ': this.settings.positionalArgumentSeparator}`
                        } else {
                            stringfiedRepresentationOfStructParameters = stringfiedRepresentationOfStructParameters + ` ${await rawKey._representation_()}`+
                            `${isLastItemInDict ? ' ': this.settings.positionalArgumentSeparator}`
                        }
                    }
                }
                return stringfiedRepresentationOfStructParameters 
            }
        }
        const attributesLength = await this.attributes._length_()
        const doesHaveAttributes = await attributesLength._representation_() > 0

        let stringRepresentation = ''
        if (this.doesModuleCanCreateStructs === true) {
            stringRepresentation = `<${this.settings.moduleKeyword} ${this.moduleName} (` +
            `${await getStructParametersRepresentation()})${doesHaveAttributes ? ` ${this.settings.attributesLabel}=${await (await this.attributes._string_({ident}))._representation_()}` : ''}>`
        } else {
            stringRepresentation = `<${this.settings.moduleKeyword} ${this.moduleName}` + 
            `${doesHaveAttributes ? ` ${this.settings.attributesLabel}=${await (await this.attributes._string_({ident, ignoreDocumentation: true}))._representation_()}` : ''}>`
        }
        
        if (ignoreDocumentation === true) {
            return await this.newString(stringRepresentation)
        } else {
            return await this.appendDocumentationOnStringRepresentation(stringRepresentation)
        }
    }

    /**
     * Returns the actual dict attributes of the module, when you retrieve this dict if you change the dict then it
     * will change the module as well.
     * 
     * @returns {Promise<import('./dict')>} - Returns the `attributes` dict of the module. IF the user somehow changes the dict
     * it will reflect on the module.
     */
    async _dict_() {
        return this.attributes
    }
}

module.exports = FlowModule