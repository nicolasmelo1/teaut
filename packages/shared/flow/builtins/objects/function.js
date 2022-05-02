/** @module src/formula/utils/builtin/objects/function */

const FlowObject = require('./object')
const { FUNCTION_TYPE, OBJECT_TYPE } = require('../types')
const { ReturnStatement } = require('../../helpers')

const { recordTypes } = require('../../memory')

/**
 * Similar to most languages nowadays, functions are first class citzens inside of flow. This means you can pass them around as callbacks, 
 * and they can be used as arguments to other functions and so on.
 * 
 * Functions in flow are tail call optimized, this means that some functions will not fill the call stack when called. Functions can also have default
 * or positional arguments and one doesn't exclude the other.
 * 
 * Example of functions:
 * ```
 * function fibonacci(n, a=0, b=1) do
 *      response = fibonacci(n - 1, b, a + b)
 *      if n == 0 do
 *          a
 *      else if n == 1 do
 *          b
 *      else do
 *          response
 *      end
 * end
 * ```
 * 
 * If you print the function with `function` it will show you if the function is tail call optimized or not.
 * 
 * Explanation on tail call optimization:
 * 
 * First read here: https://en.wikipedia.org/wiki/Tail_call
 * 
 * Since this is a FUNCTIONAL language we will generaly use recursion to achieve a loop. So what do we do?
 * Let's see two examples
 * 
 * EXAMPLE 1:
 * ```
 * function fibonacci(n) do
 *      if n <= 1 do
 *          n
 *      else do
 *          fibonacci(n - 1) + fibonacci(n - 2)
 *      end
 * end
 * 
 * fibonacci(5)
 * ```
 * 
 * EXAMPLE 2:
 * ```
 * function fibonacci(n; a=0; b=1) do
 *      if n == 0 do
 *          a
 *      else if n == 1 do
 *          b
 *      else do
 *          fibonacci(n - 1; b; a + b)
 *      end
 * end
 * 
 * fibonacci(5)
 * ```
 * 
 * If you read the wikipedia article you have understood that on EXAMPLE 1 we DON'T HAVE a Tail Recursion, and on the second one
 * we have Tail Recursion.
 * So how does it work?
 * 
 * The call stack on each iteration of the first function will look something like this:
 * ----------------------------------------------------------------
 * |     Iter 1   ||     Iter 2   ||     Iter 3   ||     Iter 4   |   
 * ----------------------------------------------------------------
 * | fibonacci(5) || fibonacci(4) || fibonacci(3) || fibonacci(2) |
 * ----------------| fibonacci(3) || fibonacci(2) || fibonacci(1) |
 *                 |--------------|| fibonacci(2) || fibonacci(1) |
 *                                  | fibonacci(1) || fibonacci(0) |
 *                                  ----------------| fibonacci(1) |
 *                                                  | fibonacci(0) |
 *                                                  | fibonacci(0) |
 *                                                  | fibonacci(-1)|
 *                                                  ----------------
 *  
 * in other words: each call to fibonacci function in the first example adds two more calls to the callstack. It doesn't work
 * EXACTLY like this but you get it, the difficulty is added by a factor of 2.
 * The call stack on this example, on the Iteration 4, we have 3 functions with fibonacci(1) and fibonacci(0), so you might expect
 * on the next iteration that those function calls leave the call stack.
 * Also something about callstack: remember that fibonacci(5) is still waiting for the result. so this function still is in the call
 * stack so in general the call stack would look something like this (we add to the call stack on each iteration)
 *  ----------------------------------------------------------------
 *  |     Iter 1   ||     Iter 2   ||     Iter 3   ||     Iter 4   |   
 *  ----------------------------------------------------------------
 *  | fibonacci(5) || fibonacci(5) || fibonacci(5) || fibonacci(5) |
 *  ----------------| fibonacci(4) || fibonacci(4) || fibonacci(4) |
 *                  | fibonacci(3) || fibonacci(3) || fibonacci(3) |
 *                  ----------------| fibonacci(2) || fibonacci(2) |
 *                                  | fibonacci(2) || fibonacci(2) |
 *                                  | fibonacci(2) || fibonacci(2) |
 *                                  | fibonacci(1) || fibonacci(1) |
 *                                  ----------------| fibonacci(1) |
 *                                                  | fibonacci(1) |
 *                                                  | fibonacci(0) |
 *                                                  | fibonacci(1) |
 *                                                  | fibonacci(0) |
 *                                                  | fibonacci(0) |
 *                                                  | fibonacci(-1)|
 *                                                  ----------------
 * 
 * So fibonacci(5) on the first example is 2^5 - So we need 32 loops to give the result. It is rather quickly. But when we put 
 * fibonacci(30) our code will make 2^30 = 1.073.741.824 loops to retrieve the result, this actually doesn't fill the call stack but takes
 * too long to run.
 * 
 * On the first example we can't make any optimizations but let's take a look on the callstack of the second example if we 
 * haven't made any optimizations:
 * ----------------------------------------------------------------------------------------
 * |       Iter 1       ||       Iter 2       ||       Iter 3       ||       Iter 4       |
 * ----------------------------------------------------------------------------------------
 * | fibonacci(5; 0, 1) || fibonacci(5; 0, 1) || fibonacci(5; 0, 1) || fibonacci(5; 0, 1) |
 * |--------------------|| fibonacci(4; 1, 1) || fibonacci(4; 1, 1) || fibonacci(4; 1, 1) |
 *                       |--------------------|| fibonacci(3; 1, 2) || fibonacci(3; 1, 2) |
 *                                             |--------------------|| fibonacci(2; 2, 3) |
 *                                                                   |--------------------|
 * 
 * Did you notice something different? For every iteration we add a new function to the call stack, which is better than the previous problem
 * but this is not good, can you understand why?
 * 
 * If you look closely at the CallStack class you will notice that we have a limit on how many functions we can call, which at the time of the 
 * writing is 500.
 * 
 * In other words, this will fill the callstack, and not only the callstack of our interpreter and virtual memory but the call stack of the 
 * programming language we are using for the interpreter (in this case, Javascript), so how do we solve it? With a tail call optimization (TCO).
 * 
 * So how does it work? When we are calling the fibonacci function we have access on what is on the peek of the callstack, we can know
 * if we are in a recursion or not. So, if we are in a recursion, and the result of the hole block of code is a function (a function in the interpreters
 * language, on this case, javascript) what we do is, we add the next function call to the same callstack of our current function.
 * 
 * Our callstack would look something like:
 * 
 * ----------------------------------------------------------------------------------------
 * |       Iter 1       ||       Iter 2       ||       Iter 3       ||       Iter 4       |
 * ----------------------------------------------------------------------------------------
 * | fibonacci(5; 0, 1) || fibonacci(4; 1, 1) || fibonacci(3; 1, 2) || fibonacci(2; 2, 3) |
 * ----------------------------------------------------------------------------------------
 * 
 * We are updating the first call stack with the next one and so on. We do this by putting the code in a while, and while the return of the evaluation
 * of the block is a function (in our interpreter's programming language) we keep iterating until we get the last value. This will guarantee it will not
 * fill either the call stack of the interpreter or the virtual memory.
 */
class FlowFunction extends FlowObject {
    constructor(settings) {
        super(settings, FUNCTION_TYPE)
    }

    /**
     * Static method for creating a new FlowFunction
     *
     * @param {string} functionName - When no function name is provided we create a new '<lambda>' function.
     * @param {import('../../memory/record')} scope - This is the Scope when the function was created, not when
     * it is being called.
     * @param {import('./dict')} parameters - This is a dict containing all of the parameters that this function recieve,
     * by default we don't have Undefined in flow, so Undefined is represented as a FlowObject.
     * 
     * @param {object} optionalParameters - The optional parameters object that must be passed when creating functions
     * in the interpreter but opitional when creating functions in builtin library modules.
     * @param {import('../../parser/nodes').Block | null} [optionalParameters.bodyAST=null] - The Block node to evaluate
     * when the function is called. This is the piece of code that we will run when we call the function. It will always be
     * a Block node type because it's a series of statements.
     * @param {import('../../interpreter') | null} [optionalParameters.interpreter=null] - When we call a function we need to
     * have access to the memory and the interpreter so first: we can evaluate the bodyAst and second: we can control the 
     * memory inside of the interpreter, that's why we pass the hole instance of the interpreter here.
     * 
     * @returns {Promise<FlowFunction>} - Return a new FlowFunction containing it's parameters and node to be executed when called. So we
     * can call it or pass it around inside of Flow 
     */
    static async new(settings, functionName, scope, parameters, { bodyAST=null, interpreter=null} = {}) {
        return await (new FlowFunction(settings))._initialize_(functionName, scope, parameters, { bodyAST, interpreter })
    }

    /**
     * We initialize the function by getting the scope the function was defined in, 
     * the scope will be the Record instance the call stack when the function was defined.
     * 
     * @param {string} functionName - When no function name is provided we create a new '<lambda>' function.
     * @param {import('../../memory/record')} scope - This is the Scope when the function was created, not when
     * it is being called.
     * @param {import('./dict')} parameters - This is a dict containing all of the parameters that this function recieve,
     * by default we don't have Undefined in flow, so Undefined is represented as a FlowObject.
     * 
     * @param {object} optionalParameters - The optional parameters object that must be passed when creating functions
     * in the interpreter but opitional when creating functions in builtin library modules.
     * @param {import('../../parser/nodes').Block | null} [optionalParameters.bodyAST=null] - The Block node to evaluate
     * when the function is called. This is the piece of code that we will run when we call the function. It will always be
     * a Block node type because it's a series of statements.
     * @param {import('../../interpreter') | null} [optionalParameters.interpreter=null] - When we call a function we need to
     * have access to the memory and the interpreter so first: we can evaluate the bodyAst and second: we can control the 
     * memory inside of the interpreter, that's why we pass the hole instance of the interpreter here.
     * 
     * @returns {Promise<FlowFunction>} - Return a new FlowFunction containing it's parameters and node to be executed when called. So we
     * can call it or pass it around inside of Flow 
     */
    async _initialize_(functionName, scope, parameters, {bodyAST=null, interpreter=null} = {}) {
        this.isTailCallOptimized = false
        this.functionName = functionName
        this.scope = scope
        /** @type {import('./dict')} */
        this.parameters = parameters
        this.bodyAST = bodyAST
        this.interpreter = interpreter

        return await super._initialize_()
    }
    
    /**
     * The string representation of the function are not like other programming languages. The string representation of the function is like:
     * ```
     * "<function fibonacci ( n, teste=<function teste ( a=2, b=[
     *  1,
     *  2,
     *  3
     * ] )> )>"
     * ```
     * 
     * for the function:
     * ```
     * function teste(a=2, b=[1, 2, 3]) do end
     * 
     * function fibonacci(n, teste=teste) do
     *      if n <= 1 do
     *          n
     *      else do
     *          fibonacci(n - 1) + fibonacci(n - 2)
     *      end
     * end
     * 
     * fibonacci
     * ```
     * 
     * In other words, the string representation shows the function name and the parameters that the function recieve.
     * 
     * We also print to the user, after he runs the function if the function is tail call optimized or not. If it's not then we print as we said before.
     * If it is we add the <tail call optimized> to the string representation to show the function is tail call optimized.
     * 
     * @param {object} options - The options object that contains the indentation number and other data for the print function.
     * @param {number} [options.ident=4] - The indentation number. By default it is 4 spaces.
     * @param {boolean} [options.ignoreDocumentation=false] - If we should show the documentation or not.
     * 
     * @returns {Promise<import('./string')>} - The string representation of the function.
     */
    async _string_({ident=4, ignoreDocumentation=false}={}) {
        let stringfiedRepresentationOfParameters = ``
        for (let i=0; i < this.parameters.hashTable.keys.numberOfElements; i++) {
            if (this.parameters.hashTable.keys.array[i] !== undefined) {
                const rawKey = await this.parameters.hashTable.rawKeys.getItem(i)
                const rawValue = await this.parameters._getitem_(rawKey)
                const stringfiedValue = await rawValue._string_({ident, ignoreDocumentation: true})
                const value = await stringfiedValue._representation_()
                
                const isLastItemInDict = await (await this.parameters._length_())._representation_() - 1 === i
                if (rawValue.type !== OBJECT_TYPE) {
                    stringfiedRepresentationOfParameters = stringfiedRepresentationOfParameters + ` ${await rawKey._representation_()}=${value}`+
                    `${isLastItemInDict ? ' ': this.settings.positionalArgumentSeparator}`
                } else {
                    stringfiedRepresentationOfParameters = stringfiedRepresentationOfParameters + ` ${await rawKey._representation_()}`+
                    `${isLastItemInDict ? ' ': this.settings.positionalArgumentSeparator}`
                }
            }
        } 
        
        const stringRepresentation = `<${this.settings.functionKeyword} ${this.functionName} (${stringfiedRepresentationOfParameters})`+
        `${this.isTailCallOptimized ? ` <${this.settings.tailCallOptimizedMessage}>` : ''}>`
        if (ignoreDocumentation === true) {
            return await this.newString(stringRepresentation)
        } else {
            return await this.appendDocumentationOnStringRepresentation(stringRepresentation)
        }
    }

    /**
     * This method is fired when you call a function, by doing this we create all of the calling logic inside of the _call_ method.
     * and not inside the interpreter itself, this make it easier to extend this function to other places.
     * 
     * @param {import('./dict')} parameters - The parameters that are passed to the function is passed as a dict.
     * 
     * @returns {Promise<FlowObject | function>} - The function will return either a FlowObject or the function itself to evaluate
     * the function body.
     */
    async _call_(parameters) {
        if (this.interpreter !== null && this.bodyAST !== null) {
            // this is for the tail call optimization, instead of evaluating the body directly we return a function to evaluate it later and then evalute the body when we can.
            async function toEvaluateFunction() {
                const record = await this.interpreter.memory.callStack.createNewRecord(this.functionName, recordTypes.PROGRAM)
                await record.appendRecords(this.scope)
                for (let i=0; i < await(await parameters._length_())._representation_(); i++) {
                    const key = await parameters.hashTable.keys.getItem(i)
                    const rawKey = await parameters.hashTable.rawKeys.getItem(i)
                    const hash = await parameters.hashTable.hashes.getItem(i)
                    const hashNode = await parameters.hashTable.search(key, hash)
                    await record.assign(await rawKey._representation_(), hashNode.value)
                }
                await this.interpreter.memory.callStack.push(record)
                let result = null

                try {
                    result = await this.interpreter.evaluate(this.bodyAST, false)
                } catch(error) {
                    if (error instanceof ReturnStatement) {
                        result = error.value
                    } else {
                        throw error
                    }
                }    

                await this.interpreter.memory.callStack.pop()
                return result
            }

            /**
             * This will handle the tail call optmization, the first thing we do is check if the current function is the same as the last function called.
             * IF it is, this means we are in a recursion, otherwise it's not in a recursion. If it is in a recursion, we return the function to evaluate it later.
             * Otherwise we evaluate the function and return the result.
             * 
             * To make it clear: if we are in a recursion the first function called will enter the else chunk of code, all the next calls will enter the 'if' block of code.
             * 
             * This is inspired by a technique called trampolines: https://blog.logrocket.com/using-trampolines-to-manage-large-recursive-loops-in-javascript-d8c9db095ae3/
             * https://stackoverflow.com/questions/25228871/how-to-understand-trampoline-in-javascript
             * 
             * @param {() => Promise<import('./object')>} toEvaluateFunction - The function to return or the function to evaluate.
             * 
             * @returns {Promise<function|FlowObject>} - The function to evaluate later if in a recursion or the result of the FlowFunction.
             */
            async function tailCallOptimization(toEvaluateFunction) {
                const currentScope = await this.interpreter.memory.callStack.peek()
                const isInRecursion = currentScope && this.functionName === currentScope.name
                if (isInRecursion) {
                    return toEvaluateFunction
                } else {
                    let result = await toEvaluateFunction()
                    while (typeof result === 'function') {
                        this.isTailCallOptimized = true
                        result = await result()
                    }
                    return result
                } 
            }
            return tailCallOptimization.bind(this)(toEvaluateFunction.bind(this))
        } else {
            return super._call_(parameters)
        }
    }
}

module.exports = FlowFunction