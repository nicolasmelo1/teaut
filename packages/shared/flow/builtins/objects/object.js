/** @module src/formula/utils/builtin/objects/object */

const { OBJECT_TYPE, ERROR_TYPE } = require('../types')
const errorTypes = require('../errorTypes')
const { getFlowObjectId } = require('../../helpers')

/**
 * This is an object, it represents every object of reflow formulas.
 * Every object, similarly to python will contain some double underscore (or dunder) methods.
 * 
 * Those dunder methods are responsible for handling common behaviour in the program like equals, difference, sum, multiplication,
 * and so on.
 * 
 * The idea is that by doing this we take away much of the complexity and the workload of the interpreter function
 * and give more power to the builtin object types so they are able to handle itself.
 * 
 * With this we are able to create stuff like 'Hello world'.length (this .length can be a function we call on a atribute of the string type)
 * we are able to give more funcionality to the integer, strings, floats and so on.
 * 
 * The problem is that sometimes stuff can repeat between objects, like Float and Integer share a similar behaviour, but we repeat
 * the code on each one.
 * 
 * Okay, so how does this work?
 * 
 * When the interpreter finds a binary operation for example (1 + 2) 
 * 
 * what we do is valueLeft._add_(valueRight). Super simple. If you understand right, 1 will be represented
 * as an object `FlowInteger(1)`, so in other words, the REAL value is `FlowInteger(1)._add_(FlowInteger(2))`.
 * 
 * That's the kind of flexibility and achievment we can have by doing stuff like this.
 * 
 * OKAY, but what happens to the ORIGINAL value?
 * 
 * The original value can be retrieved by calling _representation_(): this is the Javascript value or the value in whatever language you are using to
 * build this interpreter on.
 */
class FlowObject {
    /**
     * @param {import('../../settings').Settings} settings - The settings object.
     * @param {string} objectType - The type of the object.
     */
    constructor(settings, objectType=OBJECT_TYPE) {
        this.type = objectType
        this.settings = settings
        this.flowObjectId = getFlowObjectId()
    }

    static async new(settings) {
        return await (new FlowObject(settings))._initialize_()
    }

    /**
     * This will append the documentation FlowString to the object so we can retrieve this documentation later when we want 
     * and need to. THis makes it really easy and simple to debug and understand the code inside of flow. We can debug all 
     * of the builtin objects and functions and also enable the user to create their own documentation for his own code.
     * 
     * @param {import('./string')} documentation - The documentation to be appended to the object. We append this value in 
     * `this.documentation` so we can retrieve it later.
     */
    async appendDocumentation(documentation) {
        this.documentation = documentation
    }

    /**
     * This is responsible for appending the documentation to the string representation of the object. With this we are able to 
     * easily display the documentation while also explaining what the object 'do' and 'is'. This makes programming with flow
     * fairly easy.
     * 
     * To use this, every _string_ representation should call this function when retuning the value
     * 
     * @param {string} stringRepresentation - The string representation of the object to append the documentation to.
     * 
     * @returns {Promise<import('./string')>} - The string representation of the object with the documentation appended.
     */
    async appendDocumentationOnStringRepresentation(stringRepresentation='') {
        let documentationRepresentation = await (await (await this._documentation_())._string_())._representation_()
        if (documentationRepresentation.startsWith('"') && documentationRepresentation.endsWith('"')) {
            documentationRepresentation = documentationRepresentation.substring(1, documentationRepresentation.length - 1)
        }
        if (documentationRepresentation !== '') {
            return await this.newString(stringRepresentation + '\n\n------------\n' + documentationRepresentation)
        } else {
            return await this.newString(stringRepresentation)
        }
    }

    /**
     * Resets the cached values of the dict so we need to evaluate again the representation.
     * 
     * This also calls the parent resetCached function if it exists. This means that if a children changes,
     * the parent will also reflect the change.
     */
     async resetCached() {
        /** 
         * @type {object} - Whenever a new operation is made we reset the _cached variable, otherwise 
         * we will keep the actual representation of the dict cached so whenever we need to retrieve again 
         * we will not have to recalculate it
         */ 
        this._cached = {
            representation: null,
            json: null,
            string: null
        }

        if (this.resetCachedParent !== undefined) {
            await this.resetCachedParent()
        }
    }

    /**
     * Append the `resetCached` function to the children so when the children changes the parent will also change. 
     * And we will always retrieve the exact representation of the list or dict.
     * 
     * @param {FlowObject} child - The child to append the resetCached function to.
     */
    async appendParentResetCached(child) {
        if (child.resetCached !== undefined) {
            child.resetCachedParent = this.resetCached.bind(this)
        }
    }

    /**
     * Returns a new Struct object that will be created inside of Flow. This will be like an object of the module, except
     * that the struct is static and is supposed to hold data.
     * 
     * @param {import('./dict')} parameters - The dictionary object containing all of the parameters recieved in the struct creation.
     * @param {import('./module')} moduleObject - The module object that created this struct, we will use that to use the special methods.
     * 
     * @returns {Promise<import('./struct')>} - A new struct object.
     */
    async newStruct(parameters, moduleObject) {
        const FlowStruct = require('./struct')
        return await FlowStruct.new(this.settings, parameters, moduleObject)
    }

    /**
     * Creates a new FlowNull object inside of Flow. FlowNull represents nothing inside of reflow. Many languages does have
     * a null value, Javascript has null, Elixir has nil, Python has None. By default we trnslate it to `None`.
     * 
     * @returns {Promise<import('./null')>} - Returns a new FlowNull instance that represents nothing inside of Flow.
     */
    async newNull() {
        const FlowNull = require('./null')
        return await FlowNull.new(this.settings)
    }

    /**
     * Returns a new flow boolean object with the value of the boolean. We created this to make it handy since most 
     * objects need to return a boolean value.
     * 
     * @param {boolean} value - The value to be converted to a boolean. Either JS own true or false.
     * 
     * @returns {Promise<import('./boolean')>} - A boolean object represented in flow
     */
    async newBoolean(value) {
        const FlowBoolean = require('./boolean')
        return await FlowBoolean.new(this.settings, value)
    }
    
    /**
     * Returns a new error since we will be using constantly inside of the object when evaluating stuff.
     * 
     * @param {string} errorType - One of the options of ``errorTypes`
     * @param {string} message - The message to be shown in the error
     * 
     * @returns {Promise<import('./error')>} - Return a new FlowError object.
     */
    async newError(errorType, message) {
        const FlowError = require('./error')
        return await FlowError.new(this.settings, errorType, message)
    }

    /**
     * Return a new FlowFloat object with the value of the float.
     * 
     * @param {number} value - The value to be converted to a FlowFloat.
     * 
     * @returns {Promise<import('./float')>} - A FlowFloat object.
     */
    async newFloat(value) {
        const FlowFloat = require('./float')
        return await FlowFloat.new(this.settings, value)
    }

    /**
     * Creates a new Integer from a given value.
     * 
     * @param {number} value - The value to be converted to a FlowInteger.
     * 
     * @returns {Promise<import('./integer')>} - A FlowInteger object.
     */
    async newInteger(value) {
        const FlowInteger = require('./integer')
        return await FlowInteger.new(this.settings, value)
    }

    /**
     * Creates a new flow string from a given value.
     * 
     * @param {string} value - The string value to be converted to a FlowString.
     * 
     * @returns {Promise<import('./string')>} - A new FlowString object instance.
     */
    async newString(value) {
        const FlowString = require('./string')
        return await FlowString.new(this.settings, value)
    }

    /**
     * Returns a new Datetime object from flow.
     * 
     * @param {object} dateData - The data to be converted to a Datetime object.
     * @param {number} [dateData.year=2000] - The year of the date.
     * @param {number} [dateData.month=1] - The month of the date.
     * @param {number} [dateData.day=1] - The day of the date.
     * @param {number} [dateData.hour=0] - The hour of the date.
     * @param {number} [dateData.minute=0] - The minute of the date.
     * @param {number} [dateData.second=0] - The second of the date.
     * @param {number} [dateData.microsecond=0] - The microsecond of the date.
     * @param {string} [dateData.timezone='UTC'] - The timezone of the date, all dates in flow are timezone aware.
     * 
     * @returns {Promise<import(./datetime)>} - A FlowDatetime object.
     */
    async newDatetime({year=2000, month=1, day=1, hour=0, minute=0, second=0, microsecond=0, timezone=undefined} = {}) {
        const FlowDatetime = require('./datetime')
        timezone = timezone === undefined ? this.settings.timezone : timezone
        return await FlowDatetime.new(this.settings, {year, month, day, hour, minute, second, microsecond, timezone})
    }

    /**
     * Creates a new FlowList with a given array of values and then return a new FlowList
     * 
     * @param {Array<FlowObject>} values - The values to be converted to a FlowList.
     * 
     * @returns {Promise<FlowList>} - Returns a new FlowList with the given values.
     */
    async newList(list=[]) {
        const FlowList = require('./list')
        return await FlowList.new(this.settings, list)
    }

    /**
     * Creates a new FlowDict object inside of flow runtime to represent
     * a hashmap.
     * 
     * @param {Array<[FlowObject, FlowObject]>} keysAndValues - An array of values to be inserted in the dict.
     * This is an array of arrays, the first item inside the inner array is the key and the second item is the value.
     * 
     * @returns {Promise<import('./dict')>} - A new FlowDict object.
     */
    async newDict(keysAndValues=[]) {
        const FlowDict = require('./dict')
        return await FlowDict.new(this.settings, keysAndValues)
    }
    
    /**
     * Works like a constructor for the object inside of flow.
     * Will always return the actual instance.
     */
    async _initialize_() {
        return this
    }

    /**
     * Returns a given attribute from the object. Attributes are when you call `struct.variable` it's the . operator.
     * 
     * @param {import('./string')} variable - The variable to be retrieved from the object. Usually will be a FlowString.
     */
    async _getattribute_(variable) {
        await this.newError(errorTypes.TYPE, `Can't retrieve ${await (await variable._string_())._representation_()}' from type ${this.type}`)
    }

    /**
     * Sets a attribute of a object.
     * 
     * @param {import('./string')} variable - The variable to be set. Usually will be a FlowString.
     * @param {FlowObject} element - The value to be set. Can be of any type.
     */
    async _setattribute_(variable, element) {
        await this.newError(errorTypes.ATTRIBUTE, `Unable to set attribute '${await (await variable._string_())._representation_()}' for type '${this.type}'.`)
    }

    /**
     * Returns an item from a list or a key value from a dict. _getitem_ is the [] operator in variables and strings.
     * 
     * @param {FlowObject} item - The item to be retrieved from the object.
     */
    async _getitem_(item) {
        await this.newError(errorTypes.KEY, `Unable to get ${await (await item._string_())._representation_()} from '${this.type}'.`)
    }

    /**
     * Sets a new item at an index or at a key.
     * 
     * @param {FlowObject} item - In what index or key to set the item.
     * @param {FlowObject} element - The element to be set at the given key or index.
     */
    async _setitem_(item, element) {
        await this.newError(errorTypes.KEY, `Unable to set element ${await (await item._string_())._representation_()} in '${await (await item._string_())._representation_()}' from '${this.type}'.`)
    }

    /**
     *  * Called when using the + operator to add the value of two objects or do other things.
     * 
     * @param {FlowObject} obj - The object to be added to the current object.
     * 
     * @return {Promise<FlowObject>} - Returns a new FlowObject if everything goes right.
     */
    async _add_(obj) {
        await this.newError(errorTypes.TYPE, `Unsuported operation '+' between types '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Called when using the - operator to subtract the value of two objects or do other things.
     * 
     * @param {FlowObject} obj - The object to be subtracted from the current object.
     * 
     * @return {Promise<FlowObject>} - Returns a new FlowObject if everything goes right.
     */
    async _subtract_(obj) {
        await this.newError(errorTypes.TYPE, `Unsuported operation '-' between types '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Called when using the / operator to divide the value of two objects or do other things.
     * 
     * @param {FlowObject} obj - The object to be divided from the current object.
     */
    async _divide_(obj) {
        await this.newError(errorTypes.TYPE, `Unsuported operation '/' between types '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Called when using the % operator to Takes the remainder of the current object or do other things.
     * 
     * @param {FlowObject} obj - The object to be used as the divisor.
     */
    async _remainder_(obj) {
        await this.newError(errorTypes.TYPE, `Unsuported operation '%' between types '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Called when using the * operator to multiply two values or do other things.
     * 
     * @param {FlowObject} obj - The object to be multiplied with the current object.
     */
    async _multiply_(obj) {
        await this.newError(errorTypes.TYPE, `Unsuported operation '*' between types '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Called when using the ^ operator to get the power of the current value or do other things.
     * 
     * @param {FlowObject} obj - The object to be used as the power.
     */
    async _power_(obj) {
        await this.newError(errorTypes.TYPE, `Unsuported operation '^' between types '${this.type}' and '${obj.type}'.`)
    }

     /**
     * Returns a boolen for `in` operations. Is a given value `in` a list? or a value _in_ a dictionary?
     * 
     * @param {FlowObject} obj - The object to be checked if it is in the list or dict.
     */
    async _in_(obj) {
        await this.newError(errorTypes.ERROR, `Type '${this.type}' is not iterable, so replace '${await (await this._string_())._representation_()}' with a iterable type.`)
    }

    /**
     * Called when using the == operator to compare the curent objects with another.
     * 
     * By default we check if the type of the objects is the same and if the representation is the same.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     */
    async _equals_(obj) {
        const isEqual = obj.type === this.type && (await obj._representation_() === await this._representation_() || obj.flowObjectId === this.flowObjectId)
        return await this.newBoolean(isEqual)
    }

    /**
     * Similar to _equals_ but checks if the objects are not equal.
     * 
     * By default we check if the type of the objects are not equal or if the representation is not the same.
     * 
     * IMPORTANT: Be aware, here we use || operator. in _equals_ we use && operator.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<import('./boolean')>} A boolean object.
     */
    async _difference_(obj) {
        const isEqual = await this._equals_(obj)
        // if false then both objects are not equal.
        const isEqualRepresentation = await isEqual._representation_()
        return await this.newBoolean(isEqualRepresentation === 0)
    }

    /**
     * Checks if the current object is less than the given object. 
     * 
     * By default we return false.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     */
    async _lessthan_(obj) {
        await this.newError(errorTypes.TYPE, `Operation '<' is not supported between '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Checks if the current object is less than or equal a given object. By default we just check if they are equals.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<import('./boolean')>} - The new boolean value.
     */
    async _lessthanequal_(obj) {
        const equalsRepresentation = await (await this._equals_(obj))._representation_()
        const lessthanRepresentation = await (await this._lessthan_(obj))._representation_()
        return await this.newBoolean(equalsRepresentation || lessthanRepresentation)    
    }

    /**
     * Checks if the current object is greater than the given object. 
     * 
     * By default we return false.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<import('./boolean')>} - The new boolean value.
     */
    async _greaterthan_(obj) {
        await this.newError(errorTypes.TYPE, `Operation '>' is not supported between '${this.type}' and '${obj.type}'.`)
    }

    /**
     * Checks if the current object is greater than or equal a given object. By default we just check if they are equal
     * first, because _greaterthan_ might throw an error. Then check if false check the _greaterthan_ that
     * might throw an error. This means by default >= and <= works like equals first.
     * 
     * @param {FlowObject} obj - The object to be compared with the current object.
     * 
     * @returns {Promise<import('./boolean')>} - The new boolean value.
     */
    async _greaterthanequal_(obj) {
        const equalsRepresentation = await (await this._equals_(obj))._representation_()
        if (equalsRepresentation) {
            return await this.newBoolean(equalsRepresentation)
        } else {
            const greaterthanRepresentation = await (await this._greaterthan_(obj))._representation_()
            return await this.newBoolean(greaterthanRepresentation)
        }
    }

    /**
     * Returns a new boolean value, by default every value inside of flow is true.
     * 
     * @returns {Promise<import('./boolean')>} - The new boolean value.
     */
    async _boolean_() {
        return await this.newBoolean(true)
    }

    /**
     * Returns the negated boolean value of the current object. If the object is true, then it will return false.
     * 
     * By default we return the opposite from what is given in the _boolean_ method.
     * 
     * @returns {Promise<import('./boolean')>} - The new boolean value.
     */
    async _not_() {
        const thisBoolean = await this._boolean_()
        return await this.newBoolean(await !await thisBoolean._representation_())
    }

    /**
     * The `and` operator to join two boolean values and retrieve if the current and the other objects are true. If one of them is false
     * we evaluate to false. We evaluate lazily, this means that if the object on the left is false, then the conditional
     * is not true so we dont need to evaluate the object on the right.
     * 
     * @param {FlowObject} obj - The object to be joined with the current object. We will only use the value returned from the 
     * _boolean_ method.
     * 
     * @returns {Promise<FlowObject>} - Return the flow object value. For example the expression ```False or 10``` will return 10.
     * This enables a functionality similar to node/javascript of variable = a && b.
     */
    async _and_(obj) {
        const thisBoolean = await this._boolean_()
        if (await thisBoolean._representation_() === 1) { 
            return obj
        } else {
            return this
        }
    }

    /**
     * The `or` operator to join two boolean values and retrieve the value. if the current or the other objects are true return a new
     * true FlowBoolean value If both the current object and the other are false we evaluate to false. We evaluate lazily, this means 
     * that if the object on the left is true, then the conditional is true so we dont need to evaluate the object on the right.
     * 
     * @param {FlowObject} obj - The object to be joined with the current object. We will only use the value returned from the 
     * _boolean_ method.
     * 
     * @returns {Promise<FlowObject>} - Return the flow object value. For example the expression ```False or 10``` will return 10.
     * This enables a functionality similar to node/javascript of variable = a || b.
     */
    async _or_(obj) {
        const thisBoolean = await this._boolean_()
        if (await thisBoolean._representation_() === 0) {
            return obj
        } else {
            return this
        }
    }

    /**
     * This is the unaryPlus operator. It returns the current object when it has the + sign in front of it. without any value
     * on the right side.
     */
    async _unaryplus_() {
        await this.newError(errorTypes.TYPE, `Bad operand type for unary + in '${this.type}'.`)
    }

    /**
     * This is the unaryMinus operator. It returns the current object when it has the - sign in front of it. without any value
     * on the right side.
     */
    async _unaryminus_() {
        await this.newError(errorTypes.TYPE, `Bad operand type for unary - in '${this.type}'.`)
    }

    /**
     * Returns a safe representation of the value in this object so we don't leak any internal data. If we returned
     * the _representation_ people could guess what programming language we are using as interpreter and also it wouldn't make
     * sense to what he would be typing.
     * 
     * @returns {Promise<import('./string')>} - Returns a string to safely represent the value.
     */
    async _string_() {
        return await this.newString('')
    }

    /**
     * This is how we represent the value in Javascript/node.js so it can understand everything we are typing.
     * 
     * By default return the actual object. All of the base objects needs to override this method.
     */
    async _representation_() {
        return this
    }

    /**
     * Retrieves the json representation of a given FlowObject. Most of the time they can be equal to representation itself,
     * but other times, for example, working with dates, they can be a lot different.
     * 
     * @returns {Promise<any>} - The json representation of the object.
     */
    async _json_() {
        await this.newError(errorTypes.TYPE, `Object of type '${this.type}' does not have a json representation.`)
    }

    /**
     * Hashes the value of the current object. By default no object is hashable in flow.
     * 
     * @returns {Promise<import('./integer')} - Returns a new FlowInteger value.
     */
    async _hash_() {
        await this.newError(errorTypes.TYPE, `Object of type '${this.type}' is not hashable.`)
    }

    /**
     * Returns the length of a given value. Just return if something is iterable.
     * 
     * @returns {Promise<import('./integer')} - Returns a new FlowInteger value.
     */
    async _length_() {
        await this.newError(errorTypes.TYPE, `Object of type '${this.type}' has no length.`)
    }

    /**
     * Calls like a function some code inside of flow. Usually this will be the code that is inside of a function.
     * 
     * @param {import('./dict')} parameters - All of the parameters of the function as a dictionary.
     */
    async _call_(parameters) {
        await this.newError(errorTypes.TYPE, `Object of type '${this.type}' is not callable.`)
    }

    /**
     * Retrieves a dictionary representation of the module or struct object. This cannot be overriden by the user
     * in any way, so we would loose functionality.
     * 
     * @returns {Promise<import('./dict')>} - Returns a new FlowDict value.
     */
    async _dict_() {
        await this.newError(errorTypes.TYPE, `Object of type '${this.type}' does not have a dict representation`)
    }

    /**
     * Handles when we `raise` an error. The nice thing about flow is that we can throw any object inside of flow.
     * 
     * This makes it easy an handy to stop many nested executions all at once. Although we can use it to stop nested executions we recommend
     * not doing so.
     * 
     * For example:
     * ```
     * x = 1
     * 
     * function loop2(x) do
     *      x = x + 1
     *      if x > 10 do
     *          raise x
     *      end
     *      x
     * end
     * 
     * function loop1(x) do
     *      loop1(loop2(x))
     * end
     * 
     * try do
     *      loop1(x)
     * otherwise (e) do
     *      e.message
     * end
     * ```
     * 
     * This example will print 11
     * 
     * @returns {Promise<import('./error')>} - Throws a new FlowError value.
     */
    async _raise_(errorType) {
        if (this.type === ERROR_TYPE) {
            throw this
        } else {
            throw await this.newError(errorType, this)
        }
    }

    async _documentation_() {
        if (this.documentation) {
            return this.documentation
        } else {
            return await this.newString('')
        }
    }
}

module.exports = FlowObject