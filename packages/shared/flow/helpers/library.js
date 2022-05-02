const esprima = require('esprima')

/**
 * Allow us to extract the arguments from a given function. Tnis is used so you and other programmers
 * can extend Flow default functionality in javascript easily and without a hassle.
 * 
 * How can we do it? Simple, just create a function and define the arguments like this: async ({a: 1, b: 2, c} = {}) => {}
 * 
 * and then let this function take care of the rest. This function will use `esprima` package https://esprima.org/ to extract
 * the AST from the function string we will then use this AST to extract the arguments of the function.
 * 
 * If you look clearly, by now this might not feel complicated for you since this is basically a simple interpreter. But
 * you are probably already familiar with interpreters right now, don't you?
 * 
 * Because this is a minified version and we have a very simple goal, the interpreter is quite simple, and just evaluate the nodes
 * that we actually need to evaluate in order to extract the arguments of the function. You will probably want to `console.log` on
 * the AST for debugging purposes.
 * 
 * Reference: https://stackoverflow.com/a/41525264 (at least for the first part and inspiration)
 * 
 * @param {function} func - The function to extract the arguments from.
 * 
 * @returns {object} - As said before your function must declare the arguments it recieve by destructuring a object. We will return the
 * the exact object that you have declared in the function so you can use to send the arguments. {a, b, c=1} = {} will be evaluated
 * to {a: undefined, b: undefined, c: 1}
 */
const parseFunctionArguments = (func) => {
    // allows us to access properties that may or may not exist without throwing 
    // TypeError: Cannot set property 'x' of undefined
    const maybe = (x) => (x || {});

    // handle conversion to string and then to JSON AST
    const functionAsString = func.toString()
    const tree = esprima.parse(functionAsString)
    const isArrowExpression = (maybe(tree.body[0]).type == 'ExpressionStatement')
    const params = isArrowExpression ? maybe(maybe(tree.body[0]).expression).params 
                                     : maybe(tree.body[0]).params

    // Will hold the actual parameters from our function
    let defaultParameters = {}
    
    /**
     * if left is a string then we assign to default parameters normally, otherwise we spread the left following by the defaultParameters.
     * The spread operator MUST BE spreaded in this exact order in order to work. That's because ...defaultParameters will hold 
     * the objects evaluated, and left will hold those objects empty. In other words. For the given example:
     * ```
     * async ({a, b={ a: 1.0, b: { c: [123, 123, 3]}}, c, d={a : 1}} = {}) => {}
     * ```
     * left will be:
     * ```
     * { a: undefined, b: {}, c: undefined, d: {} }
     * ```
     * and defaultParameters will be:
     * ```
     * { b: { c: [123, 123, 3] }, d: { a: 1 } }
     * ```
     * 
     * That's why we spread in this order.
     * 
     * Also, undefined values are returned as a string on the right so we get the actual undefined instead of the string.
     */
    const evaluateAssignementPattern = (node) => {
        const left = evaluate(node.left)
        const right = evaluate(node.right)
        if (typeof left === 'string') {
            defaultParameters[left] = right === 'undefined' ? undefined : right
        } else {
            defaultParameters = {...left, ...defaultParameters}
        }
    }

    /**
     * Evaluates ObjectExpression  and `ObjectPattern` because they are basically the same thing.
     * 
     * On the properties, if the property.value is of type Identifier, this means the property doesn't have a default value.
     * so we will assign it as undefined.
     * 
     * Otherwise just evaluate the value so we can safely assign.
     */
    const evaluateObjectExpression = (node) => {
        let object = {}
        node.properties.forEach(prop => {
            const key = evaluate(prop.key)
            if (prop.value.type === "Identifier") {
                object[key] = undefined
            } else {
                object[key] = evaluate(prop.value)
            }
        })
        return object
    }

    const evaluateIdentifier = (node) => {
        return node.name
    }

    const evaluateLiteral = (node) => {
        return node.value
    }

    const evaluateArrayExpression = (node) => {
        let newArray = []
        node.elements.forEach(element => {
            newArray.push(evaluate(element))
        })
        return newArray
    }

    /**
     * Will evaluate everything recursively, as a normal interpreter would do. If you look closely although we return the objects, it is not needed for us
     * because we update the defaultParameters object directly. So we do not use the return result of this function for nothing.
     */
    const evaluate = (param) => {
        switch (param.type) {
            case 'AssignmentPattern':
                return evaluateAssignementPattern(param)
            case 'ObjectPattern':
                return evaluateObjectExpression(param)
            case 'ObjectExpression':
                return evaluateObjectExpression(param)
            case 'ArrayExpression':
                return evaluateArrayExpression(param)
            case 'Literal':
                return evaluateLiteral(param)
            case 'Identifier':
                return evaluateIdentifier(param)
        }
    }
    

    params.forEach(param => {
        evaluate(param)
    })
    return defaultParameters
}

const translateFunctionArgumentsAndMethodName = (functionArguments, functionName, contextModule=undefined) => {
    if (contextModule !== undefined && contextModule?.methods?.[functionName] !== undefined) {
        const parametersTranslations = contextModule.methods[functionName].parameters
        functionName = contextModule.methods[functionName].methodName
        // we need this to keep the ordering.
        let newFunctionArguments = {}
        for (const [functionName, defaultValue] of Object.entries(functionArguments)){
            if (Object.keys(parametersTranslations).includes(functionName)) {
                newFunctionArguments[parametersTranslations[functionName]] = defaultValue
            } else {
                newFunctionArguments[functionName] = defaultValue
            }
        }
        functionArguments = {...newFunctionArguments}
    }

    return { translatedFunctionName: functionName, translatedFunctionArguments: functionArguments }
}


/**
 * This class is supposed to be used to transform a javascript value into a valid Flow object.
 * This way we can easily translate javascript to flow and then flow to javascript inside of our builtin library
 * modules.
 * 
 * To use you just need to instantiate the class with ```new Conversor(this.settings)``` passing the settings instance
 * and then use `.javascriptValueToFlowObject()` function to translate the value to a valid FlowObject.
 */
class Conversor {
    /**
     * @param {import('../settings').Settings} settings - The settings object that is passed to all of the objects inside of flow.
     */
    constructor(settings) {
        this.settings = settings
    }

    /**
     * This is the main method you will call to convert the values from javascript to flow. At the current time we can convert
     * only the following types:
     * - String, Number, Boolean, null, undefined, Array, Object and Date
     * 
     * @param {string | number | boolean | null | undefined | Array | Object | Date} javascriptValue - The 
     * value to convert to a FlowObject.
     * 
     * @returns {Promise<import('../builtins/objects/dict') | import('../builtins/objects/list') |
     *  import('../builtins/objects/float') | import('../builtins/objects/integer') |
     *  import('../builtins/objects/string') | import('../builtins/objects/null') | 
     *  import('../builtins/objects/object') | import('../builtins/objects/datetime') | 
     * import('../builtins/objects/boolean')>} - Returns the converted value to the respective flow object representation.
     */
    async javascriptValueToFlowObject(javascriptValue) {
        if (typeof javascriptValue === 'string') {
            return await this.#stringToFlowString(javascriptValue)
        } else if (typeof javascriptValue === 'number' && javascriptValue % 1 === 0) {
            return await this.#numberToFlowInteger(javascriptValue)
        } else if (typeof javascriptValue === 'number' && javascriptValue % 1 !== 0) {
            return await this.#numberToFlowFloat(javascriptValue)
        } else if (typeof javascriptValue === 'boolean') {
            return await this.#booleanToFlowBoolean(javascriptValue)
        } else if (javascriptValue === null) {
            return await this.#nullToFlowNull()
        } else if (javascriptValue === undefined) {
            return await this.#undefinedToFlowObject()
        } else if (javascriptValue instanceof Array) {
            return await this.#arrayToFlowList(javascriptValue)
        } else if (typeof javascriptValue === 'object') {
            return await this.#objectToFlowDict(javascriptValue)
        } else if (javascriptValue instanceof Date) {
            return await this.#dateToFlowDatetime(javascriptValue)
        } else {
            throw new Error(`Unsupported type: ${typeof javascriptValue}`)
        }
    }

    /**
     * Converts a javascript string to a flow string.
     * 
     * @param {string} string - The string to convert.
     * 
     * @returns {Promise<import('../builtins/objects/string')>} - Returns the converted string to a flow string.
     */
    async #stringToFlowString(value) {
        const FlowString = require('../builtins/objects/string')
        return await FlowString.new(this.settings, value)
    }

    /**
     * Converts a javascript number to a flow integer.
     * 
     * @param {number} value - The number to convert.
     * 
     * @returns {Promise<import('../builtins/objects/integer')>} - Returns the converted number to a flow integer.
     */
    async #numberToFlowInteger(value) {
        const FlowInteger = require('../builtins/objects/integer')
        return await FlowInteger.new(this.settings, value)
    }

    /**
     * Converts a javascript number to a flow float.
     * 
     * @param {number} value - The number to convert.
     * 
     * @returns {Promise<import('../builtins/objects/float')>} - Returns the converted number to a flow float.
     */
    async #numberToFlowFloat(value) {
        const FlowFloat = require('../builtins/objects/float')
        return await FlowFloat.new(this.settings, value)
    }

    /**
     * Converts a javascript boolean to a flow boolean.
     * 
     * @param {boolean} value - The boolean to convert.
     * 
     * @returns {Promise<import('../builtins/objects/boolean')>} - Returns the converted boolean to a flow boolean.
     */
    async #booleanToFlowBoolean(value) {
        const FlowBoolean = require('../builtins/objects/boolean')
        return await FlowBoolean.new(this.settings, value)
    }

    /**
     * Converts a javascript array to a flow list. We just loop through the array and 
     * convert each element to a flow object appending to a new array to pass as argument in the initialization
     * of the FlowList.
     * 
     * @param {Array} array - The array to convert.
     * 
     * @returns {Promise<import('../builtins/objects/list')>} - Returns the converted array to a flow list.
     */
    async #arrayToFlowList(values) {
        const FlowList = require('../builtins/objects/list')

        const array = []
        for (const element of values) {
            array.push(await this.javascriptValueToFlowObject(element))
        }
        return await FlowList.new(this.settings, array)
    }

    /**
     * Converts a javascript object to a flow dict. We just loop through the object and evaluate each key and value.
     * We convert the key to a flow object and the value to a flow object and then we append to a new array to pass as
     * argument in the initialization of the FlowDict.
     * 
     * @param {object} value - The object to convert.
     * 
     * @returns {Promise<import('../builtins/objects/dict')>} - Returns the converted object to a flow dict.
     */
    async #objectToFlowDict(value) {
        const FlowDict = require('../builtins/objects/dict')
        
        const keysAndValues = []
        for (const [jsKey, jsValue] of Object.entries(value)) {
            const key = await this.javascriptValueToFlowObject(jsKey)
            const value = await this.javascriptValueToFlowObject(jsValue)
            keysAndValues.push([key, value])
        }
        return await FlowDict.new(this.settings, keysAndValues)
    }

    /**
     * Converts a javascript date to a flow datetime. Check the initialization of FlowDatetime for further reference.
     * Also be aware that we add 1 to the month because the month starts at 0 in javascript and at 1 in flow.
     * 
     * @param {Date} value - The date to convert.
     * 
     * @returns {Promise<import('../builtins/objects/datetime')>} - Returns the converted date to a flow datetime.
     */
    async #dateToFlowDatetime(value) {
        const FlowDatetime = require('../builtins/objects/datetime')
        return await FlowDatetime.new(this.settings, { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate(), hour: value.getHours(), minute: value.getMinutes(), second: value.getSeconds() })
    }

    /**
     * Creates a new FlowNull object to represent null in Flow.
     * 
     * @returns {Promise<import('../builtins/objects/null')>} - Returns a new FlowNull object.
     */
    async #nullToFlowNull() {
        const FlowNull = require('../builtins/objects/null')
        return await FlowNull.new(this.settings)
    }

    /**
     * Creates a new FlowObject object to represent undefined in Flow. FlowObject is not exactly undefined, but instead
     * it's used as a placeholder for undefined values, specially in Flow parameters.
     * 
     * @returns {Promise<import('../builtins/objects/object')>} - Returns a new FlowObject object.
     */
    async #undefinedToFlowObject() {
        const FlowObject = require('../builtins/objects/object')
        return await FlowObject.new(this.settings)
    }
}

async function retrieveRepresentation(value) {
    const FlowObject = require('../builtins/objects/object')
    if (value instanceof FlowObject) {
        return await value._representation_()
    } else {
        return value
    }
}

module.exports = {
    retrieveRepresentation,
    parseFunctionArguments,
    translateFunctionArgumentsAndMethodName,
    Conversor
}