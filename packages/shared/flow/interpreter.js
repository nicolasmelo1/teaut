const { NodeType, TokenType } = require('./settings')
const { Memory, recordTypes} = require('./memory')
const { ReturnStatement } = require('./helpers')
const errorTypes = require('./builtins/errorTypes')
const objectTypes = require('./builtins/types')
const { 
    FlowModule,
    FlowStruct,
    FlowFunction,
    FlowNull,
    FlowBoolean, 
    FlowDatetime,
    FlowError,
    FlowInteger,
    FlowFloat,
    FlowDict,
    FlowObject,
    FlowString,
    FlowList
} = require('./builtins/objects')


/**
 * Most of the logic of the interpreter should be simple to understand and follow through. Most of the logic is implemented
 * in form of `dunder` methods inside of the objec classes inside of `./builtins/objects`. Try to keep the interpreter as simple
 * as possible. Sometimes i understand that further work in the interpreter is necessary in order to achive a functionality
 * but if you can abstract away it will be better.
 * 
 * The hole interpreter is recursive, this means that you will always call `.evaluate()` in order to retrieve a new FlowObject
 * from the interpreter. Everything should be evaluated down to a `FlowObject`.
 */
class Interpreter {
    /**
     * @param {import('./settings').Settings} settings - The settings object that we will pass around while interpreting the Flow 
     * code.
     */
    constructor(settings) {
        this.settings = settings
        this.evaluateFunctionCall = false
        this.memory = new Memory(this.settings)
    }

    /**
     * This is explained better in #handleString and #handleDocumentation methods. By default what this tries to do
     * is ignore the identation of the string or documentation and display it nicely formatted to the user.
     * 
     * So for example
     * ```
     * module MyModule do
     *     x = "
     *        This is a string
     *     "
     * end
     * 
     * MyModule.x
     * ```
     * Will be displayed as:
     * "
     *      This is a string
     * "
     * 
     * AND NOT:
     * 
     * "
     *          This is a string
     *      "
     * ^ This is generally the default behaviour in most programming languages, in Flow it is nicely formatted so
     * the user can ident the code freely without caring about breaking the value of the string.
     * 
     * @param {Array<string>} stringAsArray - The string that will be displayed to the user broken down into an array of characters.
     * 
     * @returns {Promise<Array<string>>} - The string that will be displayed to the user broken down into an array of characters.
     */
    async #ignoreIdentation(stringAsArray) {
        const reversedString = [...stringAsArray].reverse()
        
        let counter = 0
        while (reversedString[counter] === ' ') {
            counter++
        } 

        const isNextCharacterALineBreak = reversedString[counter] === '\n'
        if (isNextCharacterALineBreak) {
            // This will remove the first spaces, on the first line
            const toReplaceWithoutNewlines = reversedString.slice(0, counter).reverse().join('')
            // This will remove the spaces on every subsequent line break
            const toReplace = reversedString.slice(0, counter+1).reverse().join('')
            const string = reversedString.reverse().join('')
            const newString = string.replaceAll(toReplace, '\n').replace(toReplaceWithoutNewlines, '').split('')
            return newString
        } else {
            return reversedString.reverse()
        }
    }

    /**
     * Handy method for getting the parameters from a function call or a struct initialization. You just send the array of arguments
     * and the parametersDict and it will return the FlowDict with the parameters.
     * 
     * @param {FlowDict} parameters - The parameters that we will pass to the function.
     * @param {Array<Node>} nodeArguments - An array of arguments where each argument is a node.
     * 
     * @return {Promise<FlowDict>} - The FlowDict with the parameters defined.
     */
    async #getParametersFromArguments(parameters, nodeArguments) {
        // we need to create a new dict otherwise we will mess with the ordering of the parameters.
        const newParametersDict = await FlowDict.new(this.settings)
        let obligatoryParameters = []
        let definedParameters = []
        let toSetInParameters = []
        const parametersLength = await(await parameters._length_())._representation_()
        const argumentsLength = nodeArguments.length

        if (argumentsLength > parametersLength) {
            await FlowError.new(this.settings, errorTypes.ATTRIBUTE, `Too many arguments provided. Expected '${parametersLength}' but got '${argumentsLength}'`)
        }

        // we loop through all of the parameters but we do not set them yet, because it will mess the hashTable.rawKeys and hashTable.values
        // if we try to change the value inside of the loop, so we just store them in `toSetInParameters` to set them later.
        for (let i=0; i < await(await parameters._length_())._representation_(); i++) {
            let functionDefinitionParameterName = await parameters.hashTable.rawKeys.getItem(i)
            let defaultValueInParameter = await parameters.hashTable.values.getItem(i)

            // If the defaultValue defined on the parameters is of type Object, this means it's a obligatory parameter.
            if (defaultValueInParameter.type === objectTypes.OBJECT_TYPE) obligatoryParameters.push(await (await functionDefinitionParameterName._string_())._representation_())

            // The arguments of the functionCall or the struct initialization, we loop through them as we loop through all of the parameters.
            // notice that we loop through the parameters and not the arguments, that's because we need to check for obligatory parameters and see
            // if all parameters are defined and satisfied.
            if (nodeArguments[i]) {
                let functionCallParameterName = functionDefinitionParameterName
                let value = null
                if (nodeArguments[i].nodeType === NodeType.ASSIGN) {
                    functionCallParameterName = await FlowString.new(this.settings, nodeArguments[i].left.token.value)
                    value = await this.evaluate(nodeArguments[i].right)
                } else {
                    value = await this.evaluate(nodeArguments[i])
                }
                definedParameters.push(await (await functionCallParameterName._string_())._representation_())
                toSetInParameters.push({
                    item: functionCallParameterName,
                    value: value
                })
            } 

            if (!definedParameters.includes(await (await functionDefinitionParameterName._string_())._representation_())) {
                toSetInParameters.push({
                    item: functionDefinitionParameterName,
                    value: defaultValueInParameter
                })
            }
        }

        const thereIsNoObligatoryParameter = obligatoryParameters.length === 0
        const allObligatoryParametersAreDefined = obligatoryParameters.every(parameter => definedParameters.includes(parameter))
        if (thereIsNoObligatoryParameter || allObligatoryParametersAreDefined) {
            for (const { item, value } of toSetInParameters) {
                await newParametersDict._setitem_(item, value)
            }
            return newParametersDict
        } else {
            const parametersNotDefined = obligatoryParameters.filter(parameter => !definedParameters.includes(parameter))
            if (parametersNotDefined.length > 1) {
                await FlowError.new(this.settings, errorTypes.ATTRIBUTE, `Parameters ${parametersNotDefined.join(', ')} are obligatory, but they were not defined in your function call.`)
            } else {
                await FlowError.new(this.settings, errorTypes.ATTRIBUTE, `Parameter ${parametersNotDefined.join(', ')} is obligatory, but it was not defined in your function call.`)
            }
        }
    }

    /**
     * This method will evaluate a node and return the value of the node as a FlowObject. That's ALL it does. For every node we have functions for
     * handling each of them. So if you added a new NodeType in `./settings` file, be aware to add a new method for handling it.
     * 
     * IMPORTANT: try to define your methods in the same order you define them in this switch statement, this will make it easier
     * to find the handler of the node inside of this class.
     * 
     * IMPORTANT: Every `handle` method should have a default return value or throw an error. Because otherwise a JS function by default
     * will return undefined. And undefined is not a valid FlowObject.
     * 
     * @param {import('./parser/nodes').Node} node - The node can return either a node from the parser or the actual
     * FlowObject, no other types are supported
     * @param {boolean} evaluateFunctionCall - If set to true, this means it will force the function evaluation, otherwise it will not evaluate the function directly
     * so we can have a tail call optimization.
     * 
     * @returns {Promise<FlowObject>} - Every `.handle` function here will transform the code in a new FlowObject.
     */
    async evaluate(node, evaluateFunctionCall=true) {
        if (![null, undefined].includes(node)) {
            switch (node.nodeType) {
                case NodeType.PROGRAM:
                    return await this.#handleProgram(node)
                case NodeType.BLOCK:
                    return await this.#handleBlock(node)
                case NodeType.DOCUMENTATION:
                    return await this.#handleDocumentation(node)
                case NodeType.FUNCTION_DEFINITION:
                    return await this.#handleFunctionDefinition(node)
                case NodeType.RETURN:
                    return await this.#handleReturn(node)
                case NodeType.FUNCTION_CALL:
                    // This is this big because it handles tail call optimization so we can have large recursions.
                    let functionCallResult = await this.#handleFunctionCall(node)
                    if (evaluateFunctionCall && typeof functionCallResult === 'function') {
                        return await functionCallResult()
                    } else {
                        return functionCallResult
                    }
                case NodeType.MODULE_DEFINITION:
                    return await this.#handleModuleDefinition(node)
                case NodeType.STRUCT:
                    return await this.#handleStruct(node)
                case NodeType.IF_STATEMENT:
                    return await this.#handleIfStatement(node)
                case NodeType.TRY_STATEMENT:
                    return await this.#handleTryStatement(node)
                case NodeType.RAISE:
                    return await this.#handleRaise(node)
                case NodeType.PARAMETERS:
                    return await this.#handleParameters(node)
                case NodeType.ASSIGN:
                    return await this.#handleAssign(node)
                case NodeType.SLICE:
                    return await this.#handleSlice(node)    
                case NodeType.ATTRIBUTE:
                    return await this.#handleAttribute(node)                
                case NodeType.BINARY_OPERATION:
                    return await this.#handleBinaryOperation(node)                    
                case NodeType.BINARY_CONDITIONAL:
                    return await this.#handleBinaryConditional(node)                    
                case NodeType.BOOLEAN_OPERATION:
                    return await this.#handleBooleanOperation(node)                    
                case NodeType.UNARY_OPERATION:
                    return await this.#handleUnaryOperation(node)                    
                case NodeType.UNARY_CONDITIONAL:
                    return await this.#handleUnaryConditional(node)                    
                case NodeType.VARIABLE:
                    return await this.#handleVariable(node)                    
                case NodeType.NULL:
                    return await this.#handleNull(node)                    
                case NodeType.BOOLEAN:
                    return await this.#handleBoolean(node)                    
                case NodeType.INTEGER:
                    return await this.#handleInteger(node)                    
                case NodeType.FLOAT:
                    return await this.#handleFloat(node)
                case NodeType.STRING:
                    return await this.#handleString(node)
                case NodeType.DATETIME:
                    return await this.#handleDatetime(node)
                case NodeType.LIST:
                    return await this.#handleList(node)
                case NodeType.DICT:
                    return await this.#handleDict(node)
                default:
                    return await FlowNull.new(this.settings)
            }
        } 
        return await FlowNull.new(this.settings)
    }

    /**
     * Initializes the program, when we initialize the program we create a new record for the program to run. A record
     * is where we will store all of the variables defined in the program. If you want to initialize a builtin library 
     * (like we usually want with `this.settings.initializeBultinLibrary()` function) you can do that here.
     * 
     * We need this because after the start of the program we will append variables to the record.
     * 
     * @param {import('./parser/nodes').Program} node - The node that will be evaluated.
     * 
     * @returns {Promise<import('./builtins/objects').FlowObject>} - Everything will evaluate down to a FlowObject.
     */
    async #handleProgram(node) {
        const scope = await this.memory.callStack.createNewRecord('<main>', recordTypes.PROGRAM)
        await this.settings.initializeBuiltinLibrary(scope)
        await this.memory.callStack.push(scope)
        let result = null
        try {
            result = await this.evaluate(node.block, false)
        } catch (error) {
            if (error instanceof ReturnStatement) {
                result = error.value
            } else {
                throw error
            }
        }
        // The program finished executing so remove it from the call stack
        await this.memory.callStack.pop()
        return result
    }

    /**
     * Handles a block, a block is a set of instructions. By default we will always return FlowNone as the
     * last value of the block.
     * 
     * @param {import('./parser/nodes').Block} node - The node to evaluate will be the Block node.
     * 
     * @returns {Promise<import('./builtins/objects').FlowObject>} - At the end of the block we will return FlowObject. By default
     * a FlowNull is returned.
     */
    async #handleBlock(node) {
        let lastValue = await FlowNull.new(this.settings)
        for (const instruction of node.instructions) {
            lastValue = await this.evaluate(instruction, false)
        }
        return lastValue
    }

    /**
     * PLEASE, NOTICE THAT `* /` IS USED BECAUSE WE CANNOT USE IT WITHOUT SPACES HERE
     * The documentation is a way of documenting the code inside of Flow. We append the documentation to the
     * object itself and NOT in the variable or the scope or whatever, the documentation will be appended to the
     * value. So for example, if you have a variable `x` and you want to add a documentation to it, you can do
     * 
     * 
     * ```
     * @doc /* this represents an integer * /
     * x = 1
     * ```
     * 
     * And then the actual value 1 will hold this documentation.
     * 
     * This means that if you do
     * 
     * x = x + 1
     * 
     * You will lose the documentation of the variable `x`.
     * 
     * This is a strange functionality when defining documentation for numbers, booleans, strings, datetimes, and so on.
     * But it actually makes sense when defining documentation for modules and functions.
     * 
     * You can define a documentation in modules and functions like this:
     * ```
     * @doc /* 
     *    This is a module that can construct structs
     * * /
     * module MyModule do
     *      @doc /*
     *      Parameters:
     *          - x: string
     *      * /
     *      function doSomething(x) do
     *          # code
     *      end
     * end
     * ```
     * 
     * By default, like strings, we will ignore the identation of the documentation, the identation level is defined by where you put
     * the `* /` in the documentation. So for example:
     * 
     * ```
     * @doc /*
     *      This is a module that can construct structs
     * * /
     * ```
     * will be equal to
     * ```
     * "    This is a module that can construct structs"
     * ```
     * 
     * This:
     * ```
     * @doc /*
     *      This is a module that can construct structs
     *      * /
     * ```
     * 
     * will be equal to:
     * ```
     * "This is a module that can construct structs"
     * ```
     * 
     * That's because the `* /` defines the level of identation we want to ignore and take out from our text.
     * 
     * @param {import('./parser/nodes').Documentation} node - The Documentation node will hold the documentation value
     * and the node that will be documented inside of flow. 
     * @returns 
     */
    async #handleDocumentation(node) {
        const documentation = await FlowString.new(this.settings, (await this.#ignoreIdentation(node.token.value)).join(''))
        const value = await this.evaluate(node.value)
        await value.appendDocumentation(documentation)
        return value
    }

    /**
     *  A function in reflow formulas can be anonymous or not, in other words you can create functions as:
     * 
     * Example:
     * ```
     * function soma(a, b) do
     *      a + b
     * end
     * ```
     * 
     * or you can create them anonymously with:
     * ```
     * soma = function(a, b) do
     *      a + b
     * end
     * 
     * # same as above but easier syntax
     * 
     * soma = function (a, b): a + b
     * ```
     * functions, recieving parameters or not MUST be defined with left and right parenthesis so:
     * ```
     * function hello_world() do
     *      "Hello World"
     * end
     * ```
     * 
     * Functions, as explained in the '.handleFunctionCall()' method, are tail call optimized, this means you 
     * can loop through each function using recursion. But you should come up with a solution using a tail call optimized
     * solution otherwise you will reach the maximum memory error pretty fast.
     * 
     * @param {import('./parser/nodes').FunctionDefinition} node - The node to evaluate will be the FunctionDefinition node.
     * 
     * @returns {Promise<FlowFunction>} - The function will return a FlowFunction to be called later.
     */ 
    async #handleFunctionDefinition(node) {
        const isAnonymousFunction = node.variable === null
        const parameters = await this.evaluate(node.parameters)
        const functionName = isAnonymousFunction ? '<lambda>' : node.variable.token.value
        const scope = await this.memory.callStack.peek()

        const functionObject = await FlowFunction.new(
            this.settings, 
            functionName,
            scope, 
            parameters, 
            {
                bodyAST: node.block, 
                interpreter: this
            }
        )

        await scope.assign(functionName, functionObject)
        return functionObject
    }

    /**
     * This will handle `return` statements inside of flow. You will see that in order to achieve return statements we need a little hack. But it's not that difficult.
     * 
     * This will evaluate the expression and throw the value inside of a ReturnStatement instance. This error will guarantee that we break from any loops inside of Flow.
     * then in the function itself OR the program we will catch this error and return the value.
     * 
     * IMPORTANT: 
     * return statements are catched by the Program or by a Function. So returning a value inside of module for example will be catched from the program itself.
     * 
     * Example:
     * ```
     * return 10
     * if 20 > 10 do
     *     return 20
     * end
     * ```
     * ^ will return 10, it ignores the return statement inside of the if statement.
     * 
     * ```
     * function fibonacci(n, a=0, b=1) do
     *      if n == 0 do
     *          return a
     *      else if n == 1 do
     *          return b
     *      end
     * 
     *      return fibonacci(n - 1, b, a + b)
     * end
     * 
     * fibonacci(10)
     * ```
     * 
     * @param {import('./parser/nodes').Return} node - The node to evaluate will be the Return node. This node will hold the expression
     * that we need to evaluate.
     * 
     * @throws {ReturnStatement} - This error will be catched by the function or the program.
     */
    async #handleReturn(node) {
        throw new ReturnStatement(await this.evaluate(node.expression, false))
    }

    /**
     * This will handle when a function is called passing all of the arguments to the parameters of the function and validating if a given argument was not defined.
     * All functions are tail call optimized, for that you might want to read the explanation in the `FlowFunction` class inside of the builtins folder in the `objects` folder
     * and `function.js` file.
     * 
     * Example:
     * ```
     * soma = function(a, b) do
     *    a + b
     * end
     * 
     * soma(1, 2) == 3
     * 
     * 
     * function test() do
     *      function soma(a, b) do
     *          a + b
     *      end
     * end
     * 
     * test()(1, 2) == 3 
     * ```
     * 
     * @param {import('./parser/nodes').FunctionCall} node - The node to evaluate will be the FunctionCall node.
     * 
     * @returns {Promise<FlowObject>} - The result of the function call.
     */
    async #handleFunctionCall(node) {
        /** @type {FlowFunction} */
        const flowFunction = await this.evaluate(node.name, false)
        
        const parameters = await this.#getParametersFromArguments(flowFunction.parameters, node.functionArguments) 
        return await flowFunction._call_(parameters)
    }

    /**
     * Creates a new module inside of Flow. Modules in flow are important for 2 reasons: Organization and Creation of Structs.
     * 
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
     * Beaware that if you change x inside of the module, it will change the value for all of the "instances".
     * To use this idea of instances you should use structs instead of modules. Modules are not CLASSES/OBJECTS.
     * ```
     * interpreter = Interpreter
     * interpreter2 = Interpreter
     * 
     * interpreter.x = 20
     * 
     * interpreter2.x == 20 # this is another variable and it has changed.
     * ```
     * 
     * Besides that modules are also used to create structs, structs are better explained inside the `FlowStruct` and `#handleStruct()` method.
     * ```
     * module User(name, age, email=None)
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
     * Modules can hold variables or functions, and they all should be named, otherwise we will throw an error.
     * 
     * It's important to understand that when we are creating a module we can hold in the scope the assignment of variables.
     * That's because we want to define the module attributes inside of the module object itself and NOT in the scope.
     * 
     * So what we do is that we lock the assignment of new variables inside of the scope during the creation of the module.
     * 
     * @param {import('./parser/nodes').ModuleDefinition} node - The node to evaluate will be the ModuleDefinition node.
     * 
     * @returns {Promise<FlowModule>} - The module will return a FlowModule to be appended to the current scope.
     */
    async #handleModuleDefinition(node) {
        const isAnonymousModule = node.variable === null
        const structParameters = node.parameters !== null ? await this.evaluate(node.parameters) : await FlowNull.new(this.settings)
        const moduleName = isAnonymousModule ? `<${this.settings.moduleKeyword}>` : node.variable.token.value
        const scope = await this.memory.callStack.peek()
        const moduleObject = await FlowModule.new(this.settings, moduleName, structParameters)
        // We already added the module to the record so it'll be available for the children.
        
        await scope.assign(moduleName, moduleObject)
        scope.lockAssignmentInScope = true

        let lazyDefineModuleLiterals = []
        // first we define all of the variables and functions in the module, the other modules will wait, then we define all of the variables and modules
        for (const moduleLiteral of node.moduleLiterals) {
            if (moduleLiteral.variable !== null) {
                const attribute = await FlowString.new(this.settings, moduleLiteral.variable.token.value)
                if ([NodeType.FUNCTION_DEFINITION, NodeType.ASSIGN, 
                     NodeType.VARIABLE, NodeType.DOCUMENTATION].includes(moduleLiteral.block.nodeType)) {
                    const object = await this.evaluate(moduleLiteral.block)
                    await moduleObject._setattribute_(attribute, object)
                } else {
                    lazyDefineModuleLiterals.push({
                        attribute: attribute,
                        moduleLiteral: moduleLiteral
                    })
                }
            } else {
                await FlowError.new(this.settings, errorTypes.TYPE, `All functions or variables in '${moduleObject.moduleName}' should be named, otherwise they will not be accepted.`)
            }
        }

        for (const {attribute, moduleLiteral} of lazyDefineModuleLiterals) {
            if (moduleLiteral.block.nodeType === NodeType.MODULE_DEFINITION) {
                // A module will end evaluating by unlocking the assignment in the scope 
                // so we lock again while the loop is running
                const childrenModule = await this.#handleModuleDefinition(moduleLiteral.block, true)
                scope.lockAssignmentInScope = true

                await moduleObject._setattribute_(attribute, childrenModule)
            }
        }
        scope.lockAssignmentInScope = false
        return moduleObject
    }   

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
     *      function __add__(user, other_user) do
     *         user.age = user.age + other_user.age
     *         user 
     *      end
     * end
     * 
     * user1 = User{"Nicolas", 25}
     * user2 = User{"Lucas", 25}
     * 
     * user1 + user2 == User{"Nicolas", 50}
     * ```
     * 
     * It's important to understand that in those methods all of the arguments are positional, this means we don't care much about the arguments.
     * 
     * 
     * Most of the _ _ methods inside of object can be overriden except _representation_ for obvious reasons.
     * 
     * @param {import('./parser/nodes').Struct} node - The node to evaluate will be the Struct node.
     * 
     * @returns {Promise<FlowStruct>} - The struct will return a new FlowStruct.
     */
    async #handleStruct(node) {
        const moduleObject = await this.evaluate(node.name)
        if (moduleObject instanceof FlowModule) {
            if (moduleObject.doesModuleCanCreateStructs === true) {
                const structParameters = await this.#getParametersFromArguments(moduleObject.structParameters, node.structArguments) 
                return await FlowStruct.new(this.settings, structParameters, moduleObject)
            } else {
                await FlowError.new(this.settings, errorTypes.TYPE, `Structs cannot be created from '${moduleObject.moduleName}'`)
            }
        } else {
            await FlowError.new(this.settings, errorTypes.TYPE, `Structs can only be created from a ${this.settings.moduleKeyword}`)
        }
    }

    /**
     * The if statement is just simple as it is, it evaluate the expression. After the expression reaches it ending we 
     * get it`s boolean value for Truthy or Falsy values. Then we see if the representation of the expression result is either
     * 0 or 1, if it's 1 then it't true and then we go to the block. If it's 0 then we go to the else block.
     * 
     * The else part is optional, we just evaluate it if it exists.
     * 
     * If the expression does not have an else block, and the conditional is false, by default we will return FlowNull object.
     * 
     * IMPORTANT: You will see that we evaluate in a loop, that's because if we didn't do this, too much recursion would fill
     * the maximum call stack size of javascript. By evaluating in a loop we will not have recursion. By doing recursion, it means
     * we can have a maximum number of `else if` statements. By doing it in a loop, an infinite number of `else if` statements
     * is possible.
     * 
     * @param {import('./parser/nodes').IfStatement} node - The if statement node to evaluate, if the statement is false
     * then we do not evaluate anything, otherwise we evaluate the else block if it exists.
     * 
     * @returns {Promise<FlowObject>} - The result of the if statement.
     */
    async #handleIfStatement(node) {
        while (node) {
            const expression = await this.evaluate(node.expression)
            const expressionBoolean = await expression._boolean_()

            if (await expressionBoolean._representation_() === 1) {
                return await this.evaluate(node.block)
            } else if (node.elseStatement) {
                if (node.elseStatement.nodeType === NodeType.IF_STATEMENT) {
                    // we evaluate again the if statement inside of the loop, not needing to call the evaluate function again filling the JS
                    // call stack
                    node = node.elseStatement
                } else {
                    return await this.evaluate(node.elseStatement)
                }
            } else {
                return await FlowNull.new(this.settings)
            }
        }
    }

    /**
     * Handles the try catch statement block, similar to how python, node, or basically any other moder programming language works.
     * 
     * This will try to evaluate the try block, if it fails than it will evaluate the catch block if exists otherwise just return the
     * error object and do nothing.
     * 
     * Examples:
     * ```
     * try do
     *      1 / 0
     * end
     * 
     * 
     * try do
     *      1 / 0
     * otherwise do
     *      "Error"
     * end
     * 
     * 
     * try do
     *      1 / 0
     * otherwise e do
     *      Error.message(e) -> "Cannot divide by 0"
     * end
     * 
     * 
     * try do
     *      1 / 0
     * otherwise (e) do
     *      Error.message(e) -> "Cannot divide by 0"
     * end
     * ```
     * 
     * All of those examples will throw an error. 
     * The first one will evaluate to FlowNull.
     * The second will return "Error"
     * The third will return "Cannot divide by 0"
     * The fourth will return "Cannot divide by 0" but you have parenthesis in the variable block.
     * 
     * @param {import('./parser/nodes').TryStatement} node - The try catch statement node to evaluate.
     * 
     * @returns {Promise<FlowObject>} - The result of the try block or the result of the catch block.
     */
    async #handleTryStatement(node) {
        try {
            return await this.evaluate(node.block)
        } catch (error) {
            if (error instanceof FlowObject) {
                if (node.catchStatement && node.catchStatement.nodeType === NodeType.CATCH_STATEMENT) {
                    const currentScope = await this.memory.callStack.peek()
                    const catchScope = await this.memory.callStack.createNewRecord('<catch>', recordTypes.CATCH)
                    await catchScope.appendRecords(currentScope)

                    if (node.catchStatement.variable !== null && node.catchStatement.variable.nodeType === NodeType.VARIABLE) {
                        await catchScope.assign(node.catchStatement.variable.token.value, error)
                    }

                    await this.memory.callStack.push(catchScope)
                    const catchBlockResult = await this.evaluate(node.catchStatement.block)
                    await this.memory.callStack.pop()
                    
                    return catchBlockResult
                } else {
                    return await FlowNull.new(this.settings)
                }
            } else {
                throw error
            }
        }
    }

    /**
     * This node will handle when we want to raise an error inside our Flow code.
     * 
     * This will by default create a new FlowError object and throw it inside of flow runtime, if you throw inside of a try othewise block we will run the otherwise part, 
     * or simply return the error.
     * 
     * The nice thing about flow is that we can throw any object inside of flow.
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
     * This example will return '11'
     * 
     * Also you have two ways of throwing an error:
     * ```
     * raise "Error" -> Will raise an error of type "Error" and message "Error"
     * 
     * raise "CustomError": "Error" -> Will raise an error of type "CustomError" and message "Error"
     * ```
     * 
     * @param {import('./parser/nodes').Raise} node - The node to evaluate will be the Raise node. This node only has an expression value for us to evaluate
     * down to a FlowObject.
     * 
     * @return {FlowError} - The error object to throw.
     */
    async #handleRaise(node) {
        let errorType = await FlowString.new(this.settings, errorTypes.ERROR)
        if (node.type !== null) {
            errorType = await this.evaluate(node.type)
        }
        const flowObject = await this.evaluate(node.expression)
        return await flowObject._raise_(errorType)
    }

    /**
     * This will get the parameters for functions or module structs. The parameters will always be a simple FlowDict.
     * This flowDict can be either empty or with values.
     * 
     * Example:
     * ```
     * function foo(a, b) do end
     * 
     * // the parameters will be represented like
     * {
     *    a: FlowObject(),
     *    b: FlowObject()
     * }
     * 
     * // for the example
     * function foo(a, b=1) do end
     * 
     * // the parameters will be represented like
     * {
     *    a: FlowObject(),
     *    b: FlowInteger(1)
     * }
     * ```
     * 
     * By doing that we then just append the values in order or by name to this dict so we can use the values inside of the function
     * call or struct construction.
     * 
     * We append the FlowObject to the flowDict because first it is a valid flowobject to exsist inside of the flowDict, but also because a FlowObject
     * doesn't mean anything, so we can validate that the all of the parameters were defined when we call the function or create a new struct.
     * 
     * @param {import('./parser/nodes').Parameters} node - The parameters node to evaluate to a FlowDict.
     * 
     * @returns {Promise<FlowDict>} - The parameters node evaluated to a FlowDict containing all of the parameters of the function
     * or struct.
     */
    async #handleParameters(node) {
        const parameters = await FlowDict.new(this.settings)

        for (const parameter of node.parameters) {
            if (parameter.nodeType === NodeType.VARIABLE) {
                const parameterName = await FlowString.new(this.settings, parameter.token.value)
                // We append the FlowObject to the flowDict because first it is a valid flowobject to exsist inside of the flowDict, but also because a FlowObject
                // doesn't mean anything, so we can validate that the all of the parameters were defined when we call the function or when creating a new struct.
                await parameters._setitem_(parameterName, await FlowObject.new(this.settings))
            } else if (parameter.nodeType === NodeType.ASSIGN && parameter.left.nodeType === NodeType.VARIABLE) {
                const parameterName = await FlowString.new(this.settings, parameter.left.token.value)
                await parameters._setitem_(parameterName, await this.evaluate(parameter.right))
            } else {
                if (parameter.nodeType === NodeType.ASSIGN) { 
                    let parameterWithError = parameter.left
                    while (parameterWithError.nodeType !== NodeType.VARIABLE) {
                        parameterWithError = parameterWithError.left
                    }                   
                    await FlowError.new(
                        this.settings, 
                        errorTypes.SYNTAX, 
                        `Invalid parameter. Can only assign a value to a simple variable or create a variable. Example: \nfunction (param, param2 = 10) do\n  ...\nend\n`
                    )
                } else {
                    await FlowError.new(
                        this.settings, 
                        errorTypes.SYNTAX, 
                        `Invalid parameter.`
                    )
                }
            }
        }
        return parameters
    }

    /**
     *  We can assign a value to a variable by 3 types, by variable, by slice and by attribute.
     * 
     * The first one is when we do:
     * 
     * ```
     * variable = "Assign By Variable"
     * ```
     * 
     * The second one is when we do something like:
     * ```
     * dict = {
     *      "key": [
     *          1, 2, 3
     *     ]
     * }
     * 
     * dict["key"][0] = "Assign by slice"
     * ```
     * 
     * The third one is when we do:
     * ```
     * module Struct(a, b)
     * 
     * struct = Struct{a=1, b=2}
     * 
     * struct.a = "Assign By Attribute"
     * ```
     * 
     * You can also add new functions to modules by:
     * ```
     * module Module do
     *      function defined_on_module() do
     *          "This was defined on the module"
     *      end
     * end
     * 
     * Module.defined_outside_the_module = function() do 
     *      "This was defined outside of the module"
     * end
     * 
     * Module.defined_outside_the_module() 
     * ```
     * 
     * IMPORTANT: we give names to anonymous modules and anonymous functions when they are assigned so we can have tail call optimization.
     * ```
     * Module = module do
     *      function teste() do
     *          10
     *      end
     * end
     * ```
     * By default ```module do``` will create a module named <module>. By assigning it to the Module variable the module name will not be Anonymous module
     * but instead `Module`.
     * 
     * Same for functions:
     * ```
     * teste = function() do
     *      10
     * end
     * ```
     * 
     * By default ```function() do``` will create a function named <lambda>, by assigning it to ``teste``. The function name will not be ``lambda``
     * but instead `teste`.
     * 
     * This WILL NOT WORK when defining on dicts or lists
     * 
     * 
     * It's important to understand that this WILL NOT OVERRIDE THE FUNCTIONS ALREADY DEFINED. YOU CAN ONLY DEFINE ONCE
     * in the MODULE.
     * 
     * @param {import('./parser/nodes').Assign} node - The assign node will have another node on the left, that node can be a 
     * Variable node, a Slice node or an Attribute node.
     * 
     * @returns {Promise<import('./builtins/objects').FlowObject>} - The object we want to assign to the variable will be returned
     * since this a functional programming language.
     */
    async #handleAssign(node) {
        /**
         * As explained above, this will give a default name to an anonymous module or function.
         * 
         * @param {string} variableName - The function or module name.
         * @param {FlowFunction | FlowModule} variableValue - The actual variable value to assign the value to.
         */
        const assignNameToAnonymousModulesAndFunctions = (variableName, variableValue) => {
             // gives a name to a lambda function when defined from a variable.
             if (variableValue instanceof FlowFunction) {
                if (variableValue.functionName === '<lambda>') {
                    variableValue.functionName = variableName 
                }
            }

            // gives a name to a lambda module when defined from a variable.
            if (variableValue instanceof FlowModule) {
                if (variableValue.moduleName === `<${this.settings.moduleKeyword}>`) {
                    variableValue.moduleName = variableName 
                }
            }
        }
        
        const variableValue = await this.evaluate(node.right)
        // if we assign to a normal variable
        if (node.left.nodeType === NodeType.VARIABLE) {
            const variableName = node.left.token.value
            const record = await this.memory.callStack.peek()

            assignNameToAnonymousModulesAndFunctions(variableName, variableValue)
            await record.assign(variableName, variableValue)
            return variableValue
        // Besides normal assigns we only accept other assigns on slices and attributes
        } else if ([NodeType.ATTRIBUTE, NodeType.SLICE].includes(node.left.nodeType)){
            // Gets the slice from the left and then retrieve then use this to get the object we want to assign 
            // the value to. Before this the current node will be the ASSIGN node, when we do `node = node.left`
            // `node` will be either a SLICE or ATTRIBUTE node.
            node = node.left
            
            // Just change the value on the last object of the node and this will reflect on all of the parent objects.
            // 
            // Be aware we get the object from the left of the node. The current node IS NOT THE OBJECT WE WANT TO ASSIGN THE
            // VALUE TO.
            // Example:
            //
            // dict = { "teste": { "nested": "value" } }
            // dict["teste"]["nested"]  is a string with the value "value". This is what you'd get if you did `this.evaluate(node)`
            // dict["teste"] is another dict, and this dict is the actual object we want to assign the new value to. This is what you get
            // when you do `this.evaluate(node.left)`
            if (node.nodeType === NodeType.SLICE) {
                const objectToAssignValueTo = await this.evaluate(node.left)
                const item = await this.evaluate(node.sliceValue)
                return await objectToAssignValueTo._setitem_(item, variableValue)
            } else if (node.nodeType === NodeType.ATTRIBUTE) {
                const objectToAssignValueTo = await this.evaluate(node.left)
                const variableName = node.rightValue.value
                assignNameToAnonymousModulesAndFunctions(variableName, variableValue)
                return await objectToAssignValueTo._setattribute_(await FlowString.new(this.settings, variableName), variableValue)
            }
        } else {
            if (variableValue._string_) {
                await FlowError.new(this.settings, errorTypes.SYNTAX, `Impossible to assign value ${await (await variableValue._string_())._representation_()}`)
            } else {
                await FlowError.new(this.settings, errorTypes.SYNTAX, `Impossible to assign value`)
            }
        }
    }
    
    /**
     * This will handle the slice node, this will return a new FlowObject whenever the user does something like:
     * ```
     * dict = {
     *      "teste": {
     *          "nested": {
     *              "nested2": "teste"
     *          }
     *      }
     * }
     * 
     * dict["teste"]["nested"]["nested2"] == "teste" // True
     * ```
     * or:
     * 
     * ```
     * list = [1, 2, 3, 4]
     * 
     * list[0] == 1 // True
     * list[-1] == 4 // True
     * ```
     * 
     * Slices works for indexes or key attributes, all of them will use the _getitem_ method of the FlowObject.
     * 
     * @param {import('./parser/nodes').Slice} node - The slice node will have a left node and a right node.
     */
    async #handleSlice(node) {
        const sliceValue = await this.evaluate(node.sliceValue)
        const valueLeft = await this.evaluate(node.left)

        return await valueLeft._getitem_(sliceValue)
    }

    /**
     * This method will get an attribute from a given FlowObject.
     * Attributes are different than slices. slices is when you do list[1] or dict["key"]. Attributes
     * are when you do Module.value.x or struct.another_struct.x
     * 
     * Example:
     * ```
     * module Module
     * 
     * Module.teste = function() do 
     *      10
     * end
     * 
     * Module.teste() == 10
     * ```
     * 
     * or 
     * 
     * ```
     * module StructConstructor(a, b)
     * 
     * struct = StructConstructor{1, 2}
     * 
     * struct.a == 1
     * ```
     * 
     * We do not offer custom attributes for default objects like Javascript, or python does. This means that a list in Flow for example
     * does not have `[1,2,3].length()` -> This is not valid in flow.
     * 
     * For that you should create your own logic inside of flow or use builtin module functions. For list for example we will have a default method
     * called List that has the length function so instead of the above you would do `List.length([1, 2, 3]) == 3` and so on.
     * 
     * @param {import('./parser/nodes').Attribute} node - The Attribute node that we need to evaluate and get the value from.
     * 
     * @param {Promise<FlowObject>} - Gets a FlowObject from a given string.
     */
    async #handleAttribute(node) {
        const valueLeft = await this.evaluate(node.left)
        const attribue = await FlowString.new(this.settings, node.rightValue.value)
        return await valueLeft._getattribute_(attribue)
    }

    /**
     * This handles a binary operation like 1+1, 2-2, 3/3 and so on.
     * Simple stuff actually. All of the logic for each operation can be encountered inside
     * of the primitive types. The Binary Operation will only handle MATHEMATICAL logic and not
     * boolean logic.
     * 
     * Example:
     * ```
     * 1 + 1 -> 2
     * 
     * 2 ^ 2 -> 4
     * 
     * 5 * 2 -> 10
     * 
     * 5/0 -> Error
     * 
     * "string" * 2 = "stringstring"
     * ```
     * 
     * @param {import('./parser/nodes').BinaryOperation} node - The node that will be evaluated.
     * 
     * @returns {Promise<FlowObject>} - Will definetly return a new FlowObject.
     */
    async #handleBinaryOperation(node) {
        const valueLeft = await this.evaluate(node.left, true)
        const valueRight = await this.evaluate(node.right, true)

        switch (node.operation.tokenType) {
            case TokenType.MULTIPLICATION:
                return await valueLeft._multiply_(valueRight)
            case TokenType.DIVISION:
                return await valueLeft._divide_(valueRight)
            case TokenType.SUBTRACTION:
                return await valueLeft._subtract_(valueRight)
            case TokenType.SUM:
                return await valueLeft._add_(valueRight)
            case TokenType.POWER:
                return await valueLeft._power_(valueRight)
            case TokenType.REMAINDER:
                return await valueLeft._remainder_(valueRight)
            default:
                await FlowError.new(this.settings, errorTypes.SYNTAX, 'Invalid binary operation')
        }
    }
    
    /**
     * This will handle binary conditional. This is a special case of the binary operation that instead of handling
     * mathematical operations it will handle boolean operations only. This means that generally this will return either
     * true or false from the operations. 
     * 
     * Example:
     * ```
     * 1 > 2 -> False
     * 
     * True < False -> False
     * 
     * True == 1 -> True
     * 
     * 1.2 <= 2 -> True
     * ```
     * 
     * @param {import('./parser/nodes').BinaryConditional} node - The BinaryConditional node. Different from the BinaryOperation node
     * this node is responsible only for binary boolean operations, this means that the results here will be either represented by a true
     * or false value.
     * 
     * @returns {Promise<FlowBoolean>} - Returns a new FlowBoolean to be used inside of flow.
     */
    async #handleBinaryConditional(node) {
        const valueLeft = await this.evaluate(node.left, true)
        const valueRight = await this.evaluate(node.right, true)

        switch (node.operation.tokenType) {
            case TokenType.EQUAL:
                return await valueLeft._equals_(valueRight)
            case TokenType.DIFFERENT:
                return await valueLeft._difference_(valueRight)
            case TokenType.LESS_THAN:
                return await valueLeft._lessthan_(valueRight)
            case TokenType.GREATER_THAN:
                return await valueLeft._greaterthan_(valueRight)
            case TokenType.LESS_THAN_EQUAL:
                return await valueLeft._lessthanequal_(valueRight)
            case TokenType.GREATER_THAN_EQUAL:
                return await valueLeft._greaterthanequal_(valueRight)
            case TokenType.IN:
                // this is the opposite way, because its ```10 in [1, 2, 3, 4, 10]```
                // so left is the value and right is the iterable. ```[1,2,3,4,5] in 10```
                // would not make sense.
                return await valueRight._in_(valueLeft)
            default:
                await FlowError.new(this.settings, errorTypes.SYNTAX, 'Invalid binary conditional')
        }
    }

    /**
     * Handles AND or OR operations. This will handle when we concat a boolean with a boolean using the
     * OR operator or the AND operator. By default we handle this lazily, this means that 
     * 
     * - on the case of AND:
     * If the value on the left is already false, then we don't need to evaluate the value on the right.
     * 
     * - on the case of OR:
     * If the value on the left is already true, then we don't need to evaluate the value on the right.
     * 
     * This can be quite confusing to understand with you are new to programming so i'll try to explain it:
     * 
     * If the value on the left is already false on the AND operator, this means that the value on the value
     * on the right actually doesn't matter. AND is true if both the values of the left and right are true.
     * If one is already false, then the result will always be false. If the value is not false, then we evaluate
     * the value on the right.
     * 
     * This is similar for the OR operator but on the other way around, the or will only evaluate if one OR the other is
     * true, if one is already true, so we don't need to evaluate the right, it's already true.
     * 
     * @param {import('./parser/nodes').BooleanOperation} node - The BooleanOperation node will handle when we concat a 
     * boolean with a boolean using the OR operator or the AND operator.
     * 
     * @returns {Promise<FlowBoolean>} - Returns a new FlowBoolean object to be used inside of flow.
     */
    async #handleBooleanOperation(node) {
        const valueLeft = await this.evaluate(node.left, true)
        const valueLeftBoolean = await valueLeft._boolean_()
        const valueLeftBoolRepresentation = await valueLeftBoolean._representation_()
        switch (node.operation.tokenType) {
            case TokenType.AND:
                if (valueLeftBoolRepresentation === 0) {
                    return await valueLeftBoolean
                } else {
                    const valueRight = await this.evaluate(node.right, true)
                    return await valueLeft._and_(valueRight)
                }
            case TokenType.OR:
                if (valueLeftBoolRepresentation === 1) {
                    return await valueLeftBoolean
                } else {
                    const valueRight = await this.evaluate(node.right, true)
                    return await valueLeft._or_(valueRight)
                }
            default:
                await FlowError.new(this.settings, errorTypes.SYNTAX, 'Invalid boolean operation')
        }
    }

    /**
     * Handles the unary operation inside of flow. This unary operation will handle only mathematical unary operations like + or -.
     * This will transform the value and return a new unary value. For example, 1 will become -1 and -1 will become 1. Not in place
     * but a new value will be returned.
     * 
     * Example:
     * ```
     * -1 -> -1
     * -2 -> -2
     * +(-1) -> -1
     * +(-(-1)) -> 1
     * ```
     * 
     * @param {import('./parser/nodes').UnaryOperation} node - The UnaryOperation node that will evaluate down the unary operation.
     * 
     * @returns {Promise<FlowObject>} - Returns a new FlowObject to be used inside of flow.
     */
    async #handleUnaryOperation(node) {
        const value = await this.evaluate(node.value, true)
        if (node.operation.tokenType === TokenType.SUM) {
            return await value._unaryplus_()
        } else if (node.operation.tokenType === TokenType.SUBTRACTION) {
            return await value._unaryminus_()
        } else {
            await FlowError.new(this.settings, errorTypes.SYNTAX, 'Invalid unary operation')
        }
    }

    /**
     * A UnaryConditional operation is a special case of unary operation that only handles boolean operations.
     * If you think for a little bit we have just on unary operation that handles boolean operations, this is the '!'
     * operation in javascript or the `not` in python. On flow it's also the 'not' operator that can change depending on
     * the context.
     * 
     * Example:
     * ```
     * not 1 in [1, 2, 3, 4] -> False
     * 
     * not True -> False
     * 
     * not 1 == 2 -> True
     * ```
     * 
     * @param {import('./parser/nodes').UnaryConditional} node - The UnaryConditional node to be transformed inside of flow.
     * 
     * @returns {Promise<FlowBoolean>} - Returns a new FlowBoolean object to be used inside of flow. In cases of extending the behaviour
     * in modules we can return other things.
     */
    async #handleUnaryConditional(node) {
        const value = await this.evaluate(node.value, true)
        if (node.operation.tokenType === TokenType.NOT) {
            return await value._not_()
        } else {
            await FlowError.new(this.settings, errorTypes.SYNTAX, 'Invalid unary operation')
        }
    }

    /**
     * Retrieves a variable from the memory by a given name.
     * 
     * @param {import('./parser/nodes').Variable} node - The Variable node that will be evaluated to retrieve the value from.
     * 
     * @returns {Promise<FlowObject>} - Returns the FlowObject that was living inside of the variable.
     */
    async #handleVariable(node) {
        const variableName = node.token.value
        const record = await this.memory.callStack.peek()
        const variableValue = await record.get(variableName)
        return variableValue
    }

    /**
     * Evaluates a IntegerNode node generated from the parser to FlowInteger, object that we will effectively use inside
     * of Flow.
     * 
     * @param {import('./parser/nodes').IntegerNode} node - The IntegerNode that holds the token to be evaluated
     * 
     * @returns {Promise<FlowInteger>} - Returns a new FlowInteger to be used inside of flow.
     */
    async #handleInteger(node) {
        return FlowInteger.new(this.settings, node.token.value)
    }

    /**
     * Evaluates a FloatNode node generated from the parser to a FlowFloat, object that we will effectively use inside
     * of Flow to handle float operations.
     * 
     * The float decimalPointSeparator can be changed in the settings, so you can for example have floats like:
     * 1,2 or 1.2 depending of the context of the language.
     * 
     * FlowFloat is a child of FlowInteger class so all the math operations and methods that are available in FlowInteger
     * are also available in FlowFloat.
     * 
     * @param {import('./parser/nodes').FloatNode} node - The FloatNode that holds the token value to be evaluated
     * 
     * @returns {Promise<FlowFloat>} - Returns a new FlowFloat to be used inside of flow.
     */
    async #handleFloat(node) {
        return await FlowFloat.new(this.settings, node.token.value)
    }
    
    /**
     * Evaluates a String node generated from the parser to FlowString, object that we will effectively use inside
     * of Flow to handle string operations.
     * 
     * By default, like docs, we will ignore the identation of the string, the identation level is defined by where you put
     * the last `"` in the code. So for example:
     * 
     * ```
     * "
     *      This is a module that can construct structs
     * "
     * ```
     * will be equal to
     * ```
     * "    This is a module that can construct structs"
     * ```
     * 
     * This:
     * ```
     * "
     *      This is a module that can construct structs
     *      "
     * ```
     * 
     * will be equal to:
     * ```
     * "This is a module that can construct structs"
     * ```
     * 
     * So where you put the last `"` will be used to ignore the idententation of the string. This make it a lot easier
     * for users to read make stuff with the code and not have to worry about the the identation.
     * 
     * @param {import('./parser/nodes').StringNode} node - The StringNode that holds the token value to be evaluated
     * 
     * @returns {Promise<FlowString>} - Returns a new FlowString to be used inside of flow and make operations with it.
     */
    async #handleString(node) {
        return await FlowString.new(this.settings, (await this.#ignoreIdentation(node.token.value)).join(''))
    }

    /**
     * Using the NullNode we will create a new null value that will be used inside of the flow interpreter to effectively
     * represent nothing inside of Flow
     * 
     * @param {import('./parser/nodes').NullNode} - The NullNode that holds nothing basically to be evaluated to
     * FlowNode and effectively do something inside of flow.
     * 
     * @returns {Promise<FlowNull>} - FlowNull is the object that will represent nothing inside of Flow.
     */
    async #handleNull(node) {
        return await FlowNull.new(this.settings, node.token.value)
    }

    /**
     * Using the BooleanNode we will create a new true or false FlowBoolean value that will be used inside of the flow 
     * interpreter to effectively represent `true` or `false` inside of Flow.
     * 
     * @param {import('./parser/nodes').BooleanNode} - The BooleanNode that holds the token with the boolean value to 
     * be evaluated and translated to either True or False.
     * 
     * @returns {Promise<FlowBoolean>} - FlowBoolean is the object that will represent either `True` or `False` 
     * inside of Flow.
     */
    async #handleBoolean(node) {
        return await FlowBoolean.new(this.settings, node.token.value)
    }

    /**
     * Retrieves a new FlowDatetime object that will be used inside of Flow to represent a date and time.
     * Date and time in flow are first class citzens, we consider them as primitive objects inside of flow similar to string
     * integer and booleans. By doing this the user can define date and time directly in the language without needing to create
     * an object, of importing a specific library or any other gimmics languages like python or javascript uses.
     * 
     * @param {import('./parser/nodes').DatetimeNode} node - The DatetimeNode that holds the token with the datetime value to
     * be evaluated and translated to a FlowDatetime object.
     * 
     * @returns {Promise<FlowDatetime>} - FlowDatetime is the object that will represent a date and time inside of Flow.
     */
    async #handleDatetime(node) {
        return await FlowDatetime.newFromString(this.settings, node.token.value)
    }

    /**
     * Retrieves a new FlowList object that will be used inside of Flow to represent a list of values. This list is a lot similar
     * to a javascript array. Since flow is a dynamic typed language, we can add any type of value to the list. The list can
     * hold multiple types of values at once if it needs to, a string, a float, a boolean, datetime, module, and whatever.
     * 
     * Example:
     * ```
     * function soma(a, b) do
     *      a+b 
     * end
     * 
     * module Test do
     *      function do_something() do
     *         "Hello world"
     *      end
     * end
     * 
     * list = [1, 2, 3, "hello", "world", True, False, ~D[2020-10-12], soma, Test]
     * ```
     * 
     * @param {import('./parser/nodes').List} node - The List node that will be evaluated, this holds all of the values/members
     * that we want to append to the list, after evaluating each member of the list we will create a new FlowList object to
     * use inside of Flow when you want to use a list.
     * 
     * @returns {Promise<FlowList>} - FlowList is the object that will represent a list inside of Flow.
     */
    async #handleList(node) {
        let members = []

        for (const member of node.members) {
            const value = await this.evaluate(member)
            members.push(value)
        }

        return await FlowList.new(this.settings, members)
    }

    /**
     * Retrieves a new FlowDict object that will be used inside of Flow to represent a dictionary. A dictionary is similar
     * to a python dictionary, we use strings as keys and any object as values. You can also use numbers or floats as keys,
     * anything that implements the `_hash_` method of the FlowObject is considered a valid key. At the present time we have
     * ```FlowInteger```, ```FlowString```, ```FlowFloat``` or ```FlowBoolean```as valid keys.
     * 
     * Example:
     * ```
     * dictionary = {
     *      "key1": "key2",
     *      "keyWithFunction": function () do
     *          "value"
     *      end,
     *      "keyWithObject": {
     *          2: "fromIntegerKey"
     *          True: "fromBooleanKey"
     *      }
     * }
     * ```
     * 
     * @param {import('./parser/nodes').Dict} node - The Dict node that holds the members of the dict to be evaluated
     * the memers is an array with 2 nodes, the first node will be evaluated as the key of the dict and the second node
     * will be the value. This will be translated to a FlowDict.
     * 
     * @returns {Promise<FlowDict>} - FlowDict is the object that will represent a dict inside of Flow.
     */
    async #handleDict(node) {
        let members = []
        
        for (const member of node.members) {
            const key = await this.evaluate(member[0])
            const value = await this.evaluate(member[1])
            members.push([key, value])
        }
        return await FlowDict.new(this.settings, members)
    }
}

module.exports = Interpreter