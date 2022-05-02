/** @module src/formula/utils/parser/nodes */

const { NodeType } = require('../settings')

/**
 * Each node in the AST is an instance of this class. This class represents a node in the AST.
 */
class Node {}

/**
 * Holds the node for the hole program. The program is just a block of code.
 * The hole program is the actual script that we wrote.
 */
class Program extends Node {
    nodeType = NodeType.PROGRAM

    /**
     * @param {Block} block - The block of code inside of the program.
     */
    constructor(block) {
        super()
        this.block = block
    }
}

/**
 * Holds a chunk of code. Block is meant to be an array of instruction that will do something.
 * For example, when you define a function you are defining a block of code that will be executed when the function is called.
 * A program is something that is executed once the program starts running.
 */
class Block extends Node {
    nodeType = NodeType.BLOCK

    /**
     * @param {Array<Node>} instructions - The instructions to run inside of the block.
     */
    constructor(instructions) {
        super()
        this.instructions = instructions
    }
}

/**
 * If statements are used to check if something is true or false and run a block of code inside of it.
 * Expression is the expression to be evaluated if it is true or false. Block is the block of code to run if it's true
 * and else is the chunk of code to run if the expression is false.
 */
class IfStatement extends Node {
    nodeType = NodeType.IF_STATEMENT

    /**
     * @param {Node} expression - The expression can be a variable, a simple integer, just a boolean. We will evaluate 
     * if this expression returns either a True or a False.
     * @param {Block} block - The block of code to run if the expression is true.
     * @param {Block} elseStatement - The block of code to run if the expression is false
     */
    constructor(expression, block, elseStatement=null) {
        super()
        this.expression = expression
        this.block = block
        this.elseStatement = elseStatement
    }
}

/**
 * Node used for Handling the catch part of the try catch statement.
 * By default you don't need to catch anything in the try statement. Otherwise you can catch an error and run a block of code.
 * The catch statement can have a (error) parameter. This parameter will recieve an error Struct.
 * 
 * Example:
 * ```
 * a = 1
 * try do
 *      a = "teste".length
 * otherwise (e) do
 *      a = "caiu no erro"
 * end
 * 
 * a
 * ```
 * 
 * This node will represent the `othewise` block until the end.
 */
class CatchStatement extends Node {
    nodeType = NodeType.CATCH_STATEMENT
    /**
     * @param {Block} block - The block of code to run that potentially can throw an error.
     * @param {Variable | null} variable - We will send the error struct to this variable.
     */
    constructor (block, variable=null) {
        super()
        this.block = block
        this.variable = variable
    }
}

/**
 * This node will handle a Try Catch statement. Flow is able to have a try catch logic block so you
 * can prevent errors from happening inside of your code.
 * 
 * Different from many languages the `catch` part is optional, you can have this or not, if you don't have it
 * it will return null if it throws an error inside of the try block.
 */
class TryStatement extends Node {
    nodeType = NodeType.TRY_STATEMENT    
    /**
     * @param {Block} block - The block of code to run that potentially can throw an error.
     * @param {CatchStatement} [catchStatement=null] - The block of code to run if the expression raises an error.
     */
    constructor (block, catchStatement=null) {
        super()
        this.block = block
        this.catchStatement = catchStatement
    }
}

/**
 * Raises an exception inside of flow and stops the execution of a given block of code.
 */
class Raise extends Node {
    nodeType = NodeType.RAISE

    /**
     * @param {Node} expression - The expression can be of any type, different from most languages you can throw anything inside of flow.
     * this is a behaviour similar to how JavaScript works.
     */
    constructor (expression, type=null) {
        super()
        this.expression = expression
        this.type = type
    }
}

/**
 * We almost documented the hole flow language using the JSDoc documentation engine, it would be kinda funny if we didn't tried
 * to implement it inside of our own Language itself.
 * 
 * The idea is simple: When you add `@doc \* teste *\` we will append this documentation string to the next FlowObject
 * right below it. We append the documentation for the VALUES and NOT the variables. This means that if we do ANY operation
 * that creates a copy of the object, we will lose the documentation. So you will might want to try not to modify the values
 * before trying to retrieve the documentation.
 * 
 * Besides that, this is more explained in the `#handleDocumentation` method inside of the Interpreter.
 */
class Documentation extends Node {
    nodeType = NodeType.DOCUMENTATION

    /**
     * @param {import('../lexer/token')} documentation - The documentation token that will hold the actual value of the documentation
     * that we will then retireve as a string.
     * @param {Node} node - The node that will hold the documentation.
     */
    constructor (token, value) {
        super()
        this.token = token
        this.value = value
    }
}

/**
 * Modules are similar to classes, except that they are used to create structs and methods. With modules the user
 * is able to organize the code. By default everything inside of the builtin flow lib is a module.
 * With modules the user can create stuff like
 * 
 * ```
 * module MyModule do 
 *    function something do
 *      "Hello World"
 *    end
 * end
 * 
 * MyModule.something()
 * ```
 * 
 * In a module all of the functions are static.
 * 
 * As said before modules can create structs:
 * 
 * ```
 * module User(username, password, isAdmin=True)
 * 
 * user = User{"reflowAdmin", "123", isAdmin=False}
 * 
 * user.username # will be "reflowAdmin"
 * ```
 */
class ModuleDefinition extends Node {
    nodeType = NodeType.MODULE_DEFINITION

    /**
     * @param {Variable} variable - The name of the module.
     * @param {Parameters} parameters - The parameters of the module so we can create structs.
     * @param {Array< FunctionDefinition | ModuleDefinition | Assign>} moduleLiterals - The literals of the module, this is
     * every piece of code that can live inside of a module. We can't create if statements inside of a module. This would be wrong.
     * So we define what type of nodes the modules can contain.
     */
    constructor(variable, parameters=null, moduleLiterals=[]) {
        super()
        this.variable = variable
        this.parameters = parameters
        this.moduleLiterals = moduleLiterals
    }
}

/**
 * The literals of the module, this is every piece of code that can live inside of a module. 
 * We can't create if statements inside of a module. This would be just wrong. So we define what 
 * type of nodes the modules can contain inside here of the ModuleLiteral class.
 * 
 * Right now we support defining functions, another modules or assign statements inside of the module block.
 */
class ModuleLiteral extends Node {
    nodeType = NodeType.MODULE_LITERAL

    /**
     * @param {Variable} variable - The variable node that contains the name of the literal. This is used
     * so we can create assignment statemtns like ```MyModule.my_function()```
     * @param {FunctionDefinition | ModuleDefinition | Assign} block - Any piece of node that can live inside of a module.
     * Right now we only support defining functions, another modules or assign statements inside of the module block.
     */
    constructor(variable, block) {
        super()
        this.variable = variable
        this.block = block
    }
}

/**
 * Attribute nodes are what we use to define the node that handles stuff like
 * ```
 * MyModule.something()
 * ```
 * 
 * or
 * 
 * ```
 * struct.a.b.c = "Hello World"
 * ```
 * 
 * The left part of the attribute Node in the first example is the moduleName, the right part will be the functionCall
 * node.
 * 
 * On the second example we will create a tree of attribute nodes that connect to each other.
 * On the root the `struct` will be on the left and on the right we will have another ATTRIBUTE node
 * with left as `a` and on the right another ATTRIBUTE node with left as `b` and on the right another ATTRIBUTE node
 * with left as `c` and on the right a ASSIGN node.
 */
class Attribute extends Node {
    nodeType = NodeType.ATTRIBUTE

    /**
     * @param {Node} moduleName - Usually a Variable but we support any type of node here even functions or attributes, you
     * should check the parser grammar for reference here of the possible values.
     * @param {import('../lexer/token')} rightValue - A token. Also usually a variable but can be a function call a assign another attribute.
     * Check the grammar for reference.
     */
    constructor(left, rightValue) {
        super()
        this.left = left
        this.rightValue = rightValue 
    }
}

/**
 * Defines a function inside of flow.
 * 
 * Similar to languages like javascript, and different from python. Functions in flow are first
 * class citzens.
 * You can define a anonymous function a named function, whatever you want. Also similar to other languages
 * you can pass functions arround as parameters. So we can have callbacks in flow and do other stuff like
 * defining a flow method that recieves a function and do something with it.
 * 
 * Example:
 * ```
 * function my_function(a, b) do
 *   a + b
 * end
 * 
 * my_function(1, 2)
 * ```
 * 
 * or you can so stuff like, similar to js
 * 
 * ```
 * (function (a, b) do
 *      a + b
 * end)(1, 2)
 * ```
 * 
 * Now an example with a module:
 * 
 * ```
 * module MyModule do
 *      function loop_elements(index, array, callback) do
 *          callback(array[index])
 *      end
 * end
 * 
 * list = [1, 2, 3]
 * function callback(element) do
 *      element * 2
 * end
 * 
 * MyModule.loop_elements(0, list, callback) # will return 2
 * MyModule.loop_elements(1, list, callback) # will return 4
 * MyModule.loop_elements(2, list, callback) # will return 6
 * ```
 */
class FunctionDefinition extends Node {
    nodeType = NodeType.FUNCTION_DEFINITION

    /**
     * @param {Variable | null} variable - The name of the function. Can also be null because functions can be anonymous.
     * @param {Parameters} parameters - The parameters of the function. Can be either Assign so they have default values
     * or any other node. Check the grammar for reference.
     * @param {Block} block - The block of code of the function that needs to run when the function is called.
     */
    constructor(variable, parameters, block) {
        super()
        this.variable = variable
        this.parameters = parameters
        this.block = block
    }
}

/**
 * Different from languages like Elixir or Haskell, this programming language has return statements builtin
 * 
 * This means that the user can return from a function or program, this will break the execuation of the interpreter and then it will be catched
 * inside of a function or the main program.
 * 
 * That's the hole idea of the return statement inside of flow.
 * 
 * Example:
 * ```
 * function my_function(a, b) do
 *      if a > b do
 *          return a + b
 *      end
 *      return a - b
 * end
 * ```
 */
class Return extends Node {
    nodeType = NodeType.RETURN

    /**
     * @param {Node} value - The value that needs to be returned.
     */
    constructor(expression) {
        super()
        this.expression = expression
    }
}

/**
 * We said it earlier in ModuleDefinition node. But anyway, modules can create structs.
 * 
 * Structs are like objects but they hold data instead of methods (althogh we can define methods in structs).
 * 
 * Usually structs will be the response from a module method call. For example, when you call an HTTP.request
 * method it can return a ```Response``` struct so you access stuff like:
 * ```
 * response.status_code 
 * response.json
 * ```
 * 
 * It's not a module because the structs are used to hold values only.
 */
class Struct extends Node {
    nodeType = NodeType.STRUCT

    /**
     * @param {Variable} name - The name of the struct. Usually a variable that will hold this struct values.
     * @param {Array<Assign>} structArguments - The arguments of the struct. The struct can have any number of arguments
     * that you define on the module definition.
     */
    constructor(name, structArguments=[]) {
        super()
        this.name = name
        this.structArguments = structArguments
    }
}

/**
 * Defines a function call inside of flow. A function call happens everytime you put parenthesis after something.
 * 
 * Each parameter of a function can be named or not. The name will hold the left value from the call, can be a function or
 * can be a even a anonymous function inside of a parenthesis.
 * 
 * When we call the function we pass inside of the parenthesis all of the arguments for the function. We can pass the parameters
 * as ASSIGN nodes because we can have named parameters similar to Python. (JS doesn't have this).
 * 
 * example:
 * ```
 * function my_function(a, b) do
 *   a + b
 * end
 * 
 * my_function(1, 2) # this is the code that will live inside of this node
 * ```
 * 
 * we can also do
 * ```
 * function my_function(a, b) do
 *    function another(c) do
 *       a + b + c
 *    end
 * end
 * 
 * my_function(1, 2)(3) # this is the code that will live inside of this node
 * ```
 */
class FunctionCall extends Node {
    nodeType = NodeType.FUNCTION_CALL

    /**
     * @param {Node} functionName - The name of the function. Usually will be another node. In the most simple term it will
     * be the ```Variable``` node. But you should also check the grammer for reference.
     * @param {Array<Node>} functionArguments - All of the variables of the function, the variable can be another function, can be 
     * a simple String, or even a module. This is all of the parameters for the function.
     */
    constructor(name, functionArguments=[]) {
        super()
        this.name = name
        this.functionArguments = functionArguments
    } 
}

/**
 * Defines the parameters inside of flow functions and modules. This will be translated to a dict that we will then use 
 * to add each argument to when calling the function or constructing a struct.
 * 
 * Example:
 * ```
 * function (a, b, c=1) do
 *     a + b + c
 * end
 * ```
 * The a,b,c part will be the parameters of the function. And the Parameters node will hold the parameters.
 */
class Parameters extends Node {
    nodeType = NodeType.PARAMETERS

    /**
     * @param {Array<Assign|Variable>} parameters - The parameters of the function or module. Can be either Assign 
     * so they have default values or a variable node. Check the grammar for reference.
     */
    constructor(parameters=[]) {
        super()
        this.parameters = parameters
    }
}

/**
 * Boolean operation node. Really similar to BinaryOperation except that this is supposed to handle booleans value as result of 
 * the evaluation.
 * 
 * We decide separating to make it more readable and clearer for who will be mantaining this code.
 * 
 * The boolean operation will handle `And` or `Or` operations.
 */
class BooleanOperation extends Node {
    nodeType = NodeType.BOOLEAN_OPERATION

    /**
     * @param {Node} left - The left value of the operation.
     * @param {Node} right - The right value of the operation.
     * @param {import('../lexer/token')} operation - The token of the operation we should do.
     */
    constructor(left, right, operation) {
        super()
        this.left = left
        this.right = right
        this.operation = operation
    }
}

/**
 * Binary operation will evaluate a code. 1 + 2 is a binary operation. We have the 
 * Integer Node on the left with the value 1, and a Integer on the right with the value 2.
 * 
 * On the middle we have the operation token: + (plus). That's exaclty what we handle in 
 * this binary operaiton.
 * 
 * You should be extra careful for defining this node, check the grammar always. Remember that
 * multiplication and division should be handled before + and - operations. Also remember to evaluate the parenthesis.
 */
class BinaryOperation extends Node {
    nodeType = NodeType.BINARY_OPERATION

    /**
     * @param {Node} left - The left value of the operation.
     * @param {Node} right - The right value of the operation.
     * @param {import('../lexer/token')} operation - The token of the operation we should do.
     */
    constructor(left, right, operation) {
        super()
        this.left = left
        this.right = right
        this.operation = operation
    }
}

/**
 * Similar to a boolean operation. But this is more for mathmatical conditions like
 * > , >=, <=, ==, != and so on.
 * 
 * Works similar as the boolean operation and BinaryOperation nodes so i won't go further in details
 * here.
 */
class BinaryConditional extends Node {
    nodeType = NodeType.BINARY_CONDITIONAL
    
    /**
     * @param {Node} left - The left value of the operation.
     * @param {Node} right - The right value of the operation.
     * @param {import('../lexer/token')} operation - The token of the operation we should do.
     */
    constructor(left, right, operation) {
        super()
        this.left = left
        this.right = right
        this.operation = operation
    }
}

/**
 * Node responsible for handling the 'not' operation in boolean statements.
 * 
 * This node will expect a boolean result for the given function.
 */
class UnaryConditional extends Node {
    nodeType = NodeType.UNARY_CONDITIONAL

    /**
     * @param {import('../lexer/token')} operation - The token for the operation 'not'.
     * @param {Node} value - The actual value of the operation, this will come right from the operation.
     */
    constructor(operation, value) {
        super()
        this.operation = operation
        this.value = value
    }
}

/**
 * Node responsible for handling +1 and -1 operations. See that they are unary. 
 * 
 * Unary means the value is exactly -1 AND NOT 1. Unary operations are meant to be used when the number
 * exists alone. It doesn't have a value on the left side of it.
 */
class UnaryOperation extends Node {
    nodeType = NodeType.UNARY_OPERATION

    /**
     * @param {import('../lexer/token')} operation - The token for the operation '+' or '-'.
     * @param {Node} value - The actual value of the operation, this will come on the right from the operation.
     */
    constructor(operation, value) {
        super()
        this.operation = operation
        this.value = value
    }
}

/**
 * A boolean node. The accepted boolean values are either `True` or `False` by default, similar to python.
 * 
 * At the same time as the rest of the language we can translate this to whatever language we want in runtime.
 * 
 * For example. True can be translated to `Verdadeiro` and False can be translated to `Falso` if needed.
 */
class BooleanNode extends Node {
    nodeType = NodeType.BOOLEAN
    /**
     * @param {import('../lexer/token')} token - The value of the boolean as a token. The boolean will not be the interpreted value.
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * A integer node. Integers will only exist if the value does not have a decimal point.
 */
class IntegerNode extends Node {
    nodeType = NodeType.INTEGER

    /**
     * @param {import('../lexer/token')} token - The value of the integer as a token.
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * A float node inside of flow. Floats similar to excel can be translated and the language changes because of it.
 * 
 * In american excel we will usually write numbers as 1.0 or 1.45, the dot is common in america but in other parts
 * of the word this can be a little strange. 
 * 
 * So we can translate this '.' to ',' we can even translate to ';' or whatever pontuation as needed. The language will
 * understand this ponctuation and understand the number as a float. 
 * 
 * But remember that, math is the same whatever you are, so just one ponctuation is permitted.
 */
class FloatNode extends Node {
    nodeType = NodeType.FLOAT
    /**
     * @param {import('../lexer/token')} token - The value of the float as a token. The value of the token will be the value of the float 
     * not yet formatted.
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * A String node that represents a string inside flow. This string will obviously ignore '"' and '`' characters
 * from opening and closing the string.
 */
class StringNode extends Node {
    nodeType = NodeType.STRING

    /**
     * @param {import('../lexer/token')} token - The token with the value of the string. The value inside will not have the '"' and '`' characters.
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * The datetime node that holds a datetime value token. Date and time is a first class citzen inside of reflow.
 * 
 * Instead of using a different object for handling datetime like python does or javascript does we wanted to go
 * on a more excel kind of approach. We can create datetime in floats just addind ~D[2020-10-01 00:00:00] to the code.
 * 
 * The idea is that with that the user can create datetime objects freely respecting the timezone of him (the datetime is
 * timezone aware).
 */
class DatetimeNode extends Node {
    nodeType = NodeType.DATETIME
    /**
     * @param {import('../lexer/token')} token - The token of the datetime value. The value will be what is inside of '[' and ']' so '2020-10-01 00:00:00'
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * The null value, doesn't need to say much about this. This represent nothing in flow.
 */
class NullNode extends Node {
    nodeType = NodeType.NULL

    /**
     * @param {import('../lexer/token')} token - The token of the null value.
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * Assign are nodes that is responsible to assign a value to a variable.
 * 
 * Assign can live in the code as a normal variable binding, but it also can live in parameters,
 * arguments and other stuff.
 */
class Assign extends Node {
    nodeType = NodeType.ASSIGN

    /**
     * @param {Variable | Slice | Attribute} left - The left value of the operation. Usually another variable
     * @param {Node} right - The right value of the operation. Can be any value.
     */
    constructor(left, right) {
        super()
        this.left = left
        this.right = right
    }
}

/**
 * We support variables in flow similar to how most programming languages do.
 * 
 * Flow is supposed to be a dynamically typed language not a static typed language. Although static typing is good
 * it can give some barrier for people trying to learn programming. So we don't support it.
 * 
 * Variables will hold just the name of the variable so we can find it in memory when needed or save variables in memory.
 */
class Variable extends Node {
    nodeType = NodeType.VARIABLE

    /**
     * @param {import('../lexer/token')} token - The name of the variable.
     */
    constructor(token) {
        super()
        this.token = token
    }
}

/**
 * I called it slice because of the python slices, although we do not support slices like python.
 * 
 * Slice is a node that will handle the slicing of a list. In other words it will handle the code
 * to retrieve the index of a list.
 * 
 * Not just that, on dicts, the slice is going to handle the slicing of the keys.
 * 
 * Example:
 * ```
 * array = [1, 2, [3, [4], 1, 2], 5]
 * array[2][1][0] // this is the code that will live inside of this node
 * ```
 * 
 * or
 * 
 * ```
 * dicionario = {
 *    "teste": "1",
 *    "teste2": {
 *        "teste1": 1,
 *        "teste3": 3,
 *    },
 * }
 * dicionario["teste2"]["teste3"] // this is the code that will live inside of this node
 * ```
 */
class Slice extends Node {
    nodeType = NodeType.SLICE

    /**
     * @param {Node} left - The value on the left of the slice, in the first example this will be the `array` variable
     * node.
     * @param {Node} sliceValue - The value that lives inside of the slice like '1', '2', or even "teste2" and "teste3"
     */
    constructor(left, sliceValue) {
        super()
        this.left = left
        this.sliceValue = sliceValue
    }
}

/**
 * Lists are similar to python lists or arrays in javascript. Lists are DynamicArrays that doesn't have a fixed lenght. 
 * The lenght of those lists can vary depending on the values inside of them. In a list each value is retrieved by the index
 * of the value inside of the list.
 * 
 * Example:
 * ```
 * array = [1, 2, [3, [4], 1, 2], 5]
 * array[2][1][0] = "teste"
 * array
 * ```
 */
class List extends Node {
    nodeType = NodeType.LIST

    /**
     * @param {Array<Node>} values - Each value inside of the list
     */
    constructor(members=[]) {
        super()
        this.members = members
    }
}

/**
 * Dicts here are more similar to python than to javascript itself. A dict is a hashmap of key value pairs.
 * 
 * Each key can be anything. In javascript the key is usually a string. But in python it can be a boolean value
 * a string, a number, a list, whatever.
 * 
 * Here works in a similar way. Usually each key of the dict will be a string, but it can also hold a variable if you like.
 * Different from JS, if the key is a variable, it will be the value of the variable so the variable needs to exist
 * in the memory in order to be able to be used as a key.
 * 
 * Example:
 * ```
 * dicionario = {
 *    "teste": "1",
 *    "teste2": {
 *        "teste1": 1,
 *        "teste3": 3,
 *    },
 * }
 * dicionario["teste2"]["teste3"]
 * ```
 */
class Dict extends Node {
    nodeType = NodeType.DICT
    
    /**
     * @param {Array<[Node, Node]>} members - Will be a 2d array with the first element being the key and the second
     * representing the node for the value.
     */
    constructor(members=[]) {
        super()
        this.members = members
    }
}


module.exports = {
    Node,
    Program,
    Block,
    IfStatement,
    CatchStatement,
    TryStatement,
    Raise,
    Documentation,
    ModuleDefinition,
    ModuleLiteral,
    Attribute,
    FunctionDefinition,
    Return,
    Struct,
    FunctionCall,
    BooleanOperation,
    BinaryOperation,
    BinaryConditional,
    UnaryConditional,
    UnaryOperation,
    BooleanNode,
    IntegerNode,
    FloatNode,
    StringNode,
    DatetimeNode,
    NullNode,
    Parameters,
    Assign,
    Variable,
    Slice,
    List,
    Dict
}
