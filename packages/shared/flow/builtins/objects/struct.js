/** @module src/formula/utils/builtin/objects/struct */

const FlowObject = require('./object')
const { STRUCT_TYPE, ERROR_TYPE, FUNCTION_TYPE, OBJECT_TYPE, STRING_TYPE, INTEGER_TYPE } = require('../types')
const errorTypes = require('../errorTypes')

/**
 * Structs in flow are similar to objects in most programming languages except that structs are not instances of classes, instead they 
 * are supposed to hold static values. Structs can be created when the module implements the open and close () brackets before the `do` keyword.
 * 
 * Although Flow is supposed to be a functional programming language it actually supports features that resemble object oriented programming.
 * For example:
 * 
 * ```
 * module User(name=None, age=None, email=None) do
 *      function __initialize__(struct, attributes) do
 *         struct.name = "Nicolas"
 *         struct.age = 25
 *      end
 * end
 * 
 * user = User{}
 * 
 * user == User{"Nicolas", 25, None} -> We will override the struct initialization if we put the __initialize__ function inside of the struct creation module.
 * ```
 * 
 * With that we can override the default values of the struct during its initialization. We can also enable a kind of metaprogramming in flow by giving access
 * of other special methods like:
 * 
 * ```
 * module User(name=None, age=None, email=None) do
 *      function _add_(struct, other) do
 *         struct.age + other.age
 *         struct 
 *      end
 * end
 * 
 * user1 = User{"Nicolas", 25}
 * user2 = User{"Lucas", 25}
 * 
 * user1 + user2 == User{"Nicolas", 50}
 * ```
 * 
 * Most of the _ _ methods inside of object can be overriden except _representation_ for obvious reasons.
 * This is heavily inspired by python's dunder methods. Although i want to enable stuff like macros, i think
 * it will be TOO complicated for regular people to understand, and the idea of flow is to be simple for newbies
 * to program.
 */
class FlowStruct extends FlowObject {
    constructor(settings) {
        super(settings, STRUCT_TYPE)
    }

    /**
     * Checks if the parent module has the given attribute and return if it does have. Usually used to check if a module
     * has a specific function implemented, so this means it will always return a FlowFunction object.
     * 
     * @param {string} attributeName - The attribute name to check if exists in the FlowModule parent moduleObject of the struct.
     * In other words, checks if the module that has constructed the struct has the given attribute.
     * 
     * @returns {Promise<import(./function) | undefined>} - Returns the FlowFunction object if the module has the attribute, otherwise returns undefined.
     */    
    async #checkIfModuleHasAttributeAndGetValueIfYes(attributeName) {
        const attributeValue = await this.newString(attributeName)
        try {
            const customMethod = await this.moduleObject._getattribute_(attributeValue)
            if (customMethod.type === FUNCTION_TYPE) {
                return customMethod
            } else {
                return undefined
            }
        } catch (error) {
            if (error.type && error.type === ERROR_TYPE) {
                return undefined
            } else {
                throw error
            }
        }
    }

    /**
     * Returns the parameters needed for the special method. For example '_add_' will expect the struct on the left as the first parameter and the value
     * on the right as the second parameter.
     * 
     * @returns {Promise<import('./object')>} - Returns a new dict that will hold all of the parameters to pass to the FlowFunction object that will override the behaviour.
     */
    async #getSpecialMethodParameters(flowFunction, dataToPass=[]) {
        const newParametersDict = await this.newDict()

        const lengthOfParameters = await(await flowFunction.parameters._length_())._representation_()
        const dataToPassLength = dataToPass.length

        if (lengthOfParameters !== dataToPassLength) {
            throw new Error(`${this.moduleObject.name} expects ${lengthOfParameters} parameters, but ${dataToPassLength} were passed.`)
        }
        for (let i=0; i < lengthOfParameters; i++) {
            let parameterName = await flowFunction.parameters.hashTable.rawKeys.getItem(i)
            let defaultValueInParameter = await flowFunction.parameters.hashTable.values.getItem(i)
            if (dataToPass[i]) {
                await newParametersDict._setitem_(parameterName, dataToPass[i])
            } else {
                await newParametersDict._setitem_(parameterName, defaultValueInParameter)
            }
        }

        return newParametersDict
    }

    static async new(settings, parameters, moduleObject) {
        return await (new FlowStruct(settings))._initialize_(parameters, moduleObject)
    }

    /**
     * This will have a default behaviour of just creating the struct with the given parameters. Otherwise you can override it by implementing
     * the ''__initialize__'' method inside of the struct module. This method will be called when the struct is created and will recieve the struct
     * that is being created as well as the parameters (as a dict) that were passed to the struct.
     * 
     * Example:
     * ```
     * module User(name=None, age=None, email=None) do
     *    function __initialize__(struct, attributes) do
     *       struct.name = "Nicolas"
     *       struct.age = 25
     *       struct
     *    end
     * end
     * 
     * user = User{}
     * user == User{"Nicolas", 25, None}
     * ```
     * 
     * This example will override the struct creation and this other will work just as normal without any extra gimmicks.
     * ```
     * module User(name=None, age=None, email=None)
     * 
     * user = User{"Lucas"}
     * user == User{"Lucas", None, None}
     * ```
     * 
     * @param {import('./dict')} parameters - The dictionary object containing all of the parameters recieved in the struct creation.
     * @param {import('./module')} moduleObject - THe module object that created this struct, we will use that to use the special methods.
     * 
     * @returns {Promise<FlowStruct | FlowObject>} - Returns the struct object that was created or the object that was returned by the overriden _initialize_ method.
     */
    async _initialize_(parameters, moduleObject=null) {
        this.moduleObject = moduleObject

        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._initialize_)
        if (customFunction !== undefined) {
            this.parameters = await this.newDict()
            const result = await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, parameters]))
            return result
        } else {
            this.parameters = parameters
            return super._initialize_()
        }
    }

    /**
     * This will have a default behaviour of just setting a variable inside of the struct. Otherwise you can override it by implementing
     * the `__setattribute__` method inside of the struct module. We recommend using this rarely since you might lose functionality when 
     * you do this and might not be able to use the struct properly.
     * 
     * Example:
     * ```
     * module User(name=None, age=None, email=None)
     * user = User{"Lucas"}
     * user.name = "Nicolas"
     * 
     * user.name == "Nicolas"
     * ```
     * 
     * The overriden example:
     * ```
     * custom_dict = {}
     * module User(name=None, age=None, email=None) do
     *      function __setattribute__(struct, attribute_name, attribute_value) do
     *         custom_dict[attribute_name] = attribute_value
     *      end
     * end
     * 
     * user = User{"Lucas"}
     * user.name = "Nicolas"
     * 
     * custom_dict == {"name": "Nicolas"}
     * ```
     * 
     * @param {import('./string')} variable - The name of the attribute to set.
     * @param {import('./element')} element - The element to set on the attribute value.
     * 
     * @returns {Promise<FlowObject>} - Returns the object that was inserted in the struct or the response from the overriden _setattribute_ method.
     */
    async _setattribute_(variable, element) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._setattribute_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, variable, element]))
        } else {
            return await this.parameters._setitem_(variable, element)
        }
    }

     /**
     * This will have a default behaviour of just getting a particular attribute inside of the struct. Otherwise you can override it by implementing
     * the `_getattribute_` method inside of the struct module. We recommend using this rarely since you might lose functionality when 
     * you do this, and also might not be able to use the struct properly.
     * 
     * Example:
     * ```
     * module User(name=None, age=None, email=None)
     * user = User{"Lucas"}
     * user.name = "Nicolas"
     * 
     * user.name == "Nicolas"
     * ```
     * 
     * The overriden example:
     * ```
     * module User(name=None, age=None, email=None) do
     *      function __getattribute__(struct, attribute_name) do
     *          if attribute_name == "name" do
     *              "Nicolas"
     *          else do
     *               struct[attribute_name]
     *          end
     *      end
     * end
     * 
     * user = User{"Lucas", 30}
     * 
     * user.name == "Nicolas"
     * user.age == 30
     * ```
     * 
     * @param {import('./string')} variable - The name of the attribute to set.
     * @param {import('./element')} element - The element to set on the attribute value.
     * 
     * @returns {Promise<FlowObject>} - Returns the object that was inserted in the struct or the response from the overriden _setattribute_ method.
     */
    async _getattribute_(variable) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._getattribute_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, variable, element]))
        } else {
            const keyToFind = await (await variable._string_())._representation_()

            if (this.parameters.hashTable.keys.array.includes(keyToFind)) {
                return await this.parameters._getitem_(variable)
            } else {
                await this.newError(errorTypes.ATTRIBUTE, `Attribute ${await (await variable._string_())._representation_()} doesn't exist in struct.`)
            }
        }
    }

    /**
     * By default the user can get the item from a struct using the attribute, but he can also access the item using the string of the 
     * attribute inside of the struct. For example:
     * ```
     * module User(name=None, age=None, email=None)
     * user = User{"Lucas"}
     * 
     * user.name == "Lucas"
     * user["name"] == "Lucas"
     * ```
     * 
     * This is because the user can override the _getattribute_ method, so we guarantee the functionality still works with the `_getitem_`
     * also we can get the value of a struct dynamically.
     * 
     * Besides that the functionality can be overriden as:
     * ```
     * module Building(floors) do
     *      function __initialize__(struct, attributes) do
     *          struct.__floors = [None] * attributes["floors"] 
     *          struct
     *      end
     * 
     *      function __getitem__(struct, floor_number) do
     *          struct.__floors[floor_number] 
     *      end
     * 
     *      function __setitem__(struct, floor_number, floor) do
     *          struct.__floors[floor_number] = floor
     *          struct
     *      end
     * end
     * 
     * building1 = Building{4} # Construct a building with 4 floors
     * building1[0] = "Reception"
     * building1[1] = "ABC Corp"
     * building1[2] = "DEF Inc"
     * 
     * building1
     * ```
     * 
     * @param {import('./string')} item - The name of the attribute to get from the struct.
     * 
     * @returns {Promise<FlowObject>} - Returns the value inside the attribute on the struct or the value from the overriden __getitem__ method.
     */
    async _getitem_(item) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._getitem_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, item]))
        } if (item.type === STRING_TYPE){
            const keyToFind = await (await item._string_())._representation_()
            if (this.parameters.hashTable.keys.array.includes(keyToFind)) {
                return await this.parameters._getitem_(item)
            } else {
                await this.newError(errorTypes.ATTRIBUTE, `Attribute ${await (await item._string_())._representation_()} doesn't exist in struct.`)
            }
        } else {
            return this.newError(errorTypes.NAME_ERROR, `Attribute ${await (await item._string_())._representation_()} doesn't exist in struct.`)
        }
    }

    /**
     * By default the user can set the item from a struct using the attribute, but he can also set a value to the item using the string of the 
     * attribute inside of the struct. For example:
     * ```
     * module User(name=None, age=None, email=None)
     * user = User{"Lucas"}
     * 
     * user["name"] = "Nicolas"
     * user.name == "Nicolas"
     * ```
     * 
     * This is because the user can override the _setattribute_ method, so we guarantee the functionality still works with the `_setitem_`
     * also we can set the value of a struct dynamically.
     * 
     * Besides that the functionality can be overriden as:
     * ```
     * module Building(floors) do
     *      function __initialize__(struct, attributes) do
     *          struct.__floors = [None] * attributes["floors"] 
     *          struct
     *      end
     * 
     *      function __getitem__(struct, floor_number) do
     *          struct.__floors[floor_number] 
     *      end
     * 
     *      function __setitem__(struct, floor_number, floor) do
     *          struct.__floors[floor_number] = floor
     *          struct
     *      end
     * end
     * 
     * building1 = Building{4} # Construct a building with 4 floors
     * building1[0] = "Reception"
     * building1[1] = "ABC Corp"
     * building1[2] = "DEF Inc"
     * 
     * building1
     * ```
     * 
     * @param {import('./string')} item - The name of the attribute to set inside of the struct.
     * @param {import('./string')} value - The name of the attribute to set inside of the struct.
     * 
     * @returns {Promise<FlowObject>} - Returns the object that was inserted in the struct or the response from the overriden _setitem_ method.
     */
    async _setitem_(item, value) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._setitem_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, item, value]))
        } if (item.type === STRING_TYPE){
            const keyToFind = await (await item._string_())._representation_()
            if (this.parameters.hashTable.keys.array.includes(keyToFind)) {
                return await this.parameters._setitem_(item, value)
            } else {
                await this.newError(errorTypes.ATTRIBUTE, `Attribute ${await (await item._string_())._representation_()} doesn't exist in struct.`)
            }
        } else {
            return this.newError(errorTypes.NAME_ERROR, `Attribute ${await (await item._string_())._representation_()} cannot be set in struct, must be a ${STRING_TYPE} type`)
        }
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __add__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be added to the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _add_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._add_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._add_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __subtract__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be subtracted from the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _subtract_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._subtract_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._subtract_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __divide__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be divided from the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _divide_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._divide_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._divide_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __remainder__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be used as the divisor.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _remainder_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._remainder_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._remainder_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __multiply__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be multiplied with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _multiply_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._multiply_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._multiply_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __power__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be used as the power.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _power_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._power_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._power_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __in__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be checked if it is in the struct.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _in_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._in_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._in_(obj)
        }   
    }

    /**
     * We check if two structs are equal if they have the same attribute and also if they were created by the same module.
     * Otherwise we just compare them normaly by checking the flow object id.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _equals_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._equals_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else if (obj.type === STRUCT_TYPE) {
            const areParametersEqual = await this.parameters._equals_(obj.parameters)
            const areParentModulesEqual = await this.moduleObject._equals_(obj.moduleObject)
            return await this.newBoolean(await areParametersEqual._representation_() && await areParentModulesEqual._representation_())
        }  else {
            return await super._equals_(obj)
        }
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __difference__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _difference_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._difference_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._difference_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __lessthan__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _lessthan_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._lessthan_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._lessthan_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __lessthanequal__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _lessthanequal_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._lessthanequal_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._lessthanequal_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __greaterthan__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _greaterthan_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._greaterthan_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._greaterthan_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __greaterthanequal__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _greaterthanequal_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._greaterthanequal_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._greaterthanequal_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __boolean__ METHOD.
     *    
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _boolean_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._boolean_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
        } else {
            return await super._boolean_()
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __not__ METHOD.
     *  
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _not_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._not_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
        } else {
            return await super._not_()
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __and__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be joined with the current object. We will only use the value returned from the 
     * _boolean_ method.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _and_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._and_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._and_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __or__ METHOD.
     * 
     * @param {FlowObject} obj - The object to be joined with the current object. We will only use the value returned from the 
     * _boolean_ method.
     * 
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _or_(obj) {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._or_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this, obj]))
        } else {
            return await super._or_(obj)
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __unaryplus__ METHOD.
     *  
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _unaryplus_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._unaryplus_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
        } else {
            return await super._unaryplus_()
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __unaryminus__ METHOD.
     *  
     * @returns {Promise<FlowObject>} - Returns the result of the function.
     */
    async _unaryminus_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._unaryminus_)
        if (customFunction !== undefined) {
            return await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
        } else {
            return await super._unaryminus_()
        }   
    }

    /**
     * By default will return a string representation like: 
     * 
     * <struct Module{ a=3, b=4 }>
     * 
     * for the Struct object:
     * ```
     * module Module(a,b)
     * 
     * struct = Module{3, 4}
     * 
     * struct
     * ```
     * 
     * This can also be overriden to give custom representation of the struct like this:
     * ```
     * module Iso8601Date(day, month, year) do
     *    function _string_(struct) do
     *        struct.year + "-" + struct.month + "-" + struct.day
     *    end
     * end
     * 
     * date = Iso8601Date{"1", "2", "1994"}
     * 
     * date
     * ```
     * 
     * The overriden method must return a string.
     * 
     * @returns {Promise<import('./string')>} - Returns a string representation of the struct.
     */
    async _string_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._string_)
        if (customFunction !== undefined) {
            const FlowString = require('./string')
            const result = await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
            if (result instanceof FlowString) {
                return result
            } else {
                return await this.newError(errorTypes.TYPE, `The _string_ method of the struct module must return a type of '${STRING_TYPE}'.`)
            }
        } else {
            const getStructParametersRepresentation = async () => {
                let stringfiedRepresentationOfStructParameters = `{`
                for (let i=0; i < this.parameters.hashTable.keys.numberOfElements; i++) {
                    if (this.parameters.hashTable.keys.array[i] !== undefined) {
                        const rawKey = await this.parameters.hashTable.rawKeys.getItem(i)
                        const rawValue = await this.parameters._getitem_(rawKey)
                        const stringfiedValue = await rawValue._string_()
                        const value = await stringfiedValue._representation_()
                        const isLastItemInDict = await (await this.parameters._length_())._representation_() - 1 === i
                        if (rawValue.type !== OBJECT_TYPE) {
                            stringfiedRepresentationOfStructParameters = stringfiedRepresentationOfStructParameters + ` ${await rawKey._representation_()}=${value}`+
                            `${isLastItemInDict ? ' ': this.settings.positionalArgumentSeparator}`
                        } else {
                            stringfiedRepresentationOfStructParameters = stringfiedRepresentationOfStructParameters + ` ${await rawKey._representation_()}`+
                            `${isLastItemInDict ? ' ': this.settings.positionalArgumentSeparator}`
                        }
                    }
                }
                return stringfiedRepresentationOfStructParameters + '}'
            }
            return await this.newString(`<${STRUCT_TYPE} ${this.moduleObject.moduleName}${await getStructParametersRepresentation()}>`)
        }
    }

    /**
     * By default we will retrieve the parameters of the struct as a json. This will be simple to comply with most apis and also use the Struct to send structured data.
     * This can also be overriden and then we will use the json representation of the result of the method.
     * 
     * @returns {Promise<any>} - The json representation of the object.
     */
    async _json_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._json_)
        if (customFunction !== undefined) {
            const result = await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
            return await result._json_()
        } else {
            return await this.parameters._json_()
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH __hash__ METHOD.
     *  
     * @returns {Promise<import('./integer')>} - Returns the hash code of the struct.
     */
    async _hash_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._hash_)
        if (customFunction !== undefined) {
            const result = await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
            if (result.type !== INTEGER_TYPE) {
                return await this.newError(errorTypes.TYPE, `The _hash_ method of the struct module must return a type of '${INTEGER_TYPE}'.`)
            } else {
                return reult
            }
        } else {
            return await super._hash_()
        }   
    }

    /**
     * DOESN'T PROVIDE ANY FUNCTIONALITY FOR THE STRUCT UNLESS OVERRIDING IT WITH _length_ METHOD.
     *  
     * @returns {Promise<import('./integer')>} - Returns the length of the struct.
     */
    async _length_() {
        const customFunction = await this.#checkIfModuleHasAttributeAndGetValueIfYes(this.settings.specialModuleMethods._length_)
        if (customFunction !== undefined) {
            const result = await customFunction._call_(await this.#getSpecialMethodParameters(customFunction, [this]))
            if (result.type !== INTEGER_TYPE) {
                return await this.newError(errorTypes.TYPE, `The _length_ method of the struct module must return a type of '${INTEGER_TYPE}'.`)
            } else {
                return reult
            }
        } else {
            return await super._length_()
        }   
    }
}

module.exports = FlowStruct