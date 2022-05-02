/** @module src/formula/utils/parser */

const { TokenType, NodeType } = require('../settings')
const nodes = require('./nodes')
const FlowError = require('../builtins/objects/error')
const { SYNTAX } = require('../builtins/errorTypes')
const { getErrorCodeContext } = require('../helpers/index')

/**
 * ////////////////////////////////////////////////////////////
 * // This is the Grammar of Reflow Formulas, it is based and inspired
 * // on EBNF grammar: https://pt.wikipedia.org/wiki/Formalismo_de_Backus-Naur_Estendido
 * // 
 * // If you don't know what grammars are, read:
 * // https://pt.wikipedia.org/wiki/Formalismo_de_Backus-Naur 
 * //
 * // Basically it is a way of representing a structure of a syntax. Every programming language
 * // has one of this. This grammar helps us with the hole logic for the parsing.
 * //
 * // _ABOUT THE PARSER_
 * // The parser uses recursion in order to transverse all of the tokens of the expression. The original article where
 * // this was inspired from (Reference: https://ruslanspivak.com/lsbasi-part7/) uses while loops in order to transverse the
 * // hole structure. I was also using this, but then i came in to conclusion that since it also uses recursion, using ONLY 
 * // recursion would be easier to comprehend. (Note that recursion is not an easy topic)
 * // 
 * // IF YOU DON'T UNDERSTAND AT FIRST DON'T WORRY, actually writting parsers is really difficult topic, and i don't know much of it either
 * // I go most by trial and error. So there is a BIG room for improvement here.
 * // 
 * // Writting an interpreter i think that it's easier than a parser and makes a lot more sense.
 * // Try to follow the tutorial above, and see how he writes it, and also try to see some parsers of famous languages (or at least the grammar)
 * // and see if you can try to understand. Also feel free to write print statements here to understand everything that it is doing. 
 * // I recommend reading from top to bottom, try to read what function he calls, what it returns. And try to understand the logic.
 * //
 * // If you still have a difficult time reading through it all, feel free to ask anytime, but try to at least read the tutorials 
 * // i've added to the formulas so it can be a LOT easier to grasp the hole concept.
 * //
 * // To improve this code we could write a pegen (parser generator), it's something languages like python uses. But i think it 
 * // needs some mental strenght to build a good one. But this gives a nice idea for improvement of this code.
 * ////////////////////////////////////////////////////////////
 * 
 * program: block END_OF_FILE
 * 
 * block: statements_list 
 * 
 * compound_statements: named_statements
 * 
 * documentation_statements: DOCUMENTATION statement
 * 
 * named_statements: FUNCTION function_statement
 *                | MODULE module_statement
 * 
 * function_statement: FUNCTION (IDENTITY)? LEFT_PARENTHESIS (parameters)?* RIGHT_PARENTHESIS ((DO block END) | (COLON assignment)
 * 
 * module_statement: MODULE IDENTITY (LEFT_PARENTHESIS (arguments)? RIGHT_PARENTHESIS)? (DO module_block_statements_list END)?
 * 
 * module_block_statements_list: (module_block_statement NEWLINE)* 
 * 
 * module_block_statement: DOCUMENTATION documentation_statements
 *                       | named_statement
 *                       | IDENTITY (assignment)?
 * 
 * arguments: ((function_statement | expression) POSITIONAL_ARGUMENT_SEPARATOR)*
 * 
 * parameters: ((IDENTITY | assignment) POSITIONAL_ARGUMENT_SEPARATOR)*
 * 
 * if_statement: IF expression DO block ((ELSE else_statement)? | END) 
 * 
 * else_statement: (ELSE DO block | ELSE IF if_statement) END
 * 
 * try_statement: TRY DO block ((CATCH catch_statement)? | END)
 * 
 * catch_statement: CATCH ((LEFT_PARENTHESIS)? variable (RIGHT_PARENTHESIS)?)? DO block END
 * 
 * statements_list: ((documentation_statements)? (statement)? NEWLINE)* 
 * 
 * statement: compound_statements
 *          | assignment
 * 
 * assignment: expression ASSIGN expression
 *           | compound_statements
 *           | expression
 * 
 * expression: IF if_statement 
 *           | TRY try_statement
 *           | disjunction
 * 
 * disjunction: (disjunction ((OR) | disjunction)*
 *            | conjunction
 * 
 * conjunction: (conjunction ((AND) | conjunction)*
 *            | inversion
 * 
 * inversion: NOT inversion
 *          | equal_comparison
 * 
 * equal_comparison: equal_comparison (( GREATER_THAN_EQUAL | LESS_THAN_EQUAL | EQUAL | DIFFERENT) equal_comparison)* 
 *                 | comparison
 * 
 * comparison: comparison (( GREATER_THAN | LESS_THAN | IN) comparison)* 
 *           | add
 * 
 * add: add ((PLUS | MINUS) add)*
 *   | product
 * 
 * product: product ((MULTIPLACATION | DIVISION | REMAINDER) product)*
 *        | power
 * 
 * power: power ((POWER) product)*
 *     | unary
 * 
 * unary: (SUM | SUBTRACTION) unary
 *      | primary
 * 
 * primary: simple_statements
 *         | atom
 *         | (slice)*
 *         | (attribute)*
 *         | (function_call)*
 * 
 * simple_statements: RAISE raise_statement
 *                  | RETURN return_statement
 * 
 * raise_statement: RAISE ((expression) | (STRING COMMA expression))
 * 
 * return_statement: RETURN expression
 * 
 * attribute: primary ATTRIBUTE IDENTITY
 * 
 * slice: primary LEFT_BRACKET (atom (POSITIONAL_ARGUMENT_SEPARATOR atom)*)? RIGHT_BRACKET
 * 
 * function_call: primary LEFT_PARENTHESIS (expression (POSITIONAL_ARGUMENT_SEPARATOR expression)*)? RIGHT_PARENTHESIS
 * 
 * atom: INTEGER 
 *     | FLOAT 
 *     | STRING
 *     | BOOLEAN
 *     | DATETIME
 *     | variable
 *     | LEFT_PARENTHESIS expression RIGHT_PARENTHESIS
 *     | LEFT_BRACES dict
 *     | LEFT_BRACKET array
 * 
 * dict: LEFT_BRACES atom COLON statement (POSITIONAL_ARGUMENT_SEPARATOR atom COLON statement)* RIGHT_BRACES
 * 
 * array: LEFT_BRACKET expression (POSITIONAL_ARGUMENT_SEPARATOR expression)* RIGHT_BRACKET
 * 
 * variable: IDENTITY
 */
class Parser {
    /**
     * @param {import('../lexer')} lexer - The lexer to use, we will get the next token as we parse.
     * @param {import('../settings').Settings} settings - This is the settings of the language so we can use handy
     * functions.
     */
    constructor (lexer, settings) {
        this.lexer = lexer
        this.settings = settings
        this.currentToken = null
    }

    /**
     * @returns {Promise<import('./nodes').Program>} - The AST node of the program to evaluate.
     */
    async parse() {
        this.currentToken = await this.lexer.getNextToken()
        return await this.program()
    }

    /**
     * When retrieving the next token we validate if the current token is the actual token that we want
     * if the token that we are expecting is not the current token, we throw an error.
     * 
     * Hey what?
     * 
     * this.currentToken will hold actually the next token. Suppose that we are evaluating a dict the first token will be the LEFT_BRACES
     * The next token will be a atom (a String, a Identity, a number or whatever). So after evaluating the atom we actually
     * Expect a COLON (:) because a dict is composed by key:value pairs. So we got the key, if the next token is not the colon then
     * we will throw an error.
     * 
     * So again, this.currentToken is always ahead while we are evaluating the program.
     * 
     * @param {string} tokenType - One of .settings.TokenType tokens. Check the TokenType class in settings.js for reference of the
     * possible tokens.
     */
    async getNextToken(tokenType) {
        if (tokenType === this.currentToken.tokenType) {
            this.currentToken = await this.lexer.getNextToken()
        } else {
            if (this.currentToken.tokenType === TokenType.END_OF_FILE) {
                await FlowError.new(
                    this.settings, 
                    SYNTAX, 
                    `Unexpected end of file, probably the character '${this.lexer.rawExpression[this.currentToken.position+1]}' at position '${this.currentToken.position}' is invalid\n` + 
                    `${getErrorCodeContext(this.currentToken.position, this.lexer.rawExpression)}`
                )
            } else {
                await FlowError.new(
                    this.settings, 
                    SYNTAX, 
                    `Expected ${this.settings.retrieveExpectedCharacterFromToken(tokenType)} but got ${this.settings.retrieveExpectedCharacterFromToken(this.currentToken.tokenType, this.currentToken.value)}\n` +
                    `${getErrorCodeContext(this.currentToken.position, this.lexer.rawExpression)}`
                )
            }
        }
    }

    /**
     * program: block END_OF_FILE
     */
    async program() {
        const blockNode = await this.block()
        const programNode = new nodes.Program(blockNode)
        if (this.currentToken.tokenType !== TokenType.END_OF_FILE) {
            await FlowError.new(
                this.settings, 
                SYNTAX, 
                `Unexpected end of file, this means your program cannot be executed and was ended abruptly\n`+
                `${getErrorCodeContext(this.currentToken.position-1, this.lexer.rawExpression)}`)
        }
        return programNode
    }

    /**
     * block: statements_list 
     */
    async block() {
        const instructions = await this.statementsList([])
        return new nodes.Block(instructions)
    }

    /**
     * statements_list: ((documentation_statements)? (statement)? NEWLINE)* 
     */
    async statementsList(instructions=[]) {
        let node = await this.documentationStatements()
        if (node === null || node === undefined) {
            node = await this.statement()
        }

        if (node !== undefined && node !== null) {
            instructions.push(node)
        }

        if (TokenType.NEWLINE === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.NEWLINE)
            return await this.statementsList(instructions)
        } else {
            return instructions
        }
    }

    /**
     * documentation_statements: DOCUMENTATION statement
     */
    async documentationStatements() {
        if (this.currentToken.tokenType === TokenType.DOCUMENTATION) {
            const documentation = this.currentToken
            await this.getNextToken(TokenType.DOCUMENTATION)
            if (TokenType.NEWLINE === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.NEWLINE)
            }
            const node = await this.statement()
            return new nodes.Documentation(documentation, node)
        }
    }

    /**
     * statement: compound_statements
     *          | assignment
     */
    async statement() {
        let node = await this.compoundStatements()
    
        if (node === null || node === undefined) {
            node = await this.assignment()       
        }     
        return node
    }

    /**
     * compound_statements: named_statements
     */
    async compoundStatements() {
        return await this.namedStatements()
    }

    /**
     * named_statements: FUNCTION function_statement
     *                | MODULE module_statement
     */
    async namedStatements() {
        if (TokenType.FUNCTION === this.currentToken.tokenType) {
            return await this.functionStatement()
        } else if (TokenType.MODULE === this.currentToken.tokenType) {
            return await this.moduleStatement()
        }
    }
    
    /**
     * simple_statements: RAISE raise_statement
     *                  | RETURN return_statement
     */
    async simpleStatements() {
        if (TokenType.RAISE === this.currentToken.tokenType) {
            return await this.raiseStatement()
        } else if (TokenType.RETURN === this.currentToken.tokenType) {
            return await this.returnStatement()
        }
    }

    /**
     * raise_statement: RAISE ((expression) | (STRING COMMA expression))
     */
    async raiseStatement() {
        if (TokenType.RAISE === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.RAISE)
            
            const messageOrType = await this.expression()
            if (TokenType.COLON === this.currentToken.tokenType) {
                if (messageOrType instanceof nodes.StringNode) {
                    await this.getNextToken(TokenType.COLON)
                    return new nodes.Raise(await this.expression(), messageOrType)
                } else {
                    await FlowError.new(this.settings, SYNTAX, 
                        `Error type should be a string.\n`+
                        `${getErrorCodeContext(this.currentToken.position-3, this.lexer.rawExpression)}`)
                }
            }
            return new nodes.Raise(messageOrType)
        }
    }

    /**
     * return_statement: RETURN expression
     */
    async returnStatement() {
        if (TokenType.RETURN === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.RETURN)
            const node = await this.expression()
            return new nodes.Return(node)
        }
    }

    /**
     * assignment: expression ASSIGN expression
     *           | compound_statements
     *           | expression
     */
    async assignment() {
        let node = await this.expression()
        
        if (this.currentToken.tokenType === TokenType.ASSIGN) {
            const left = node
            const operation = this.currentToken
            await this.getNextToken(TokenType.ASSIGN)
            let right = await this.compoundStatements()
            if (right === null || right === undefined) {
                right = await this.expression()
            }
            if (![NodeType.VARIABLE, NodeType.SLICE, NodeType.ATTRIBUTE].includes(left.nodeType)) {
                await FlowError.new(
                    this.settings,
                    SYNTAX, 
                    `Cannot assign, can only assign value to a variable, slice or attribute\n` +
                    `${getErrorCodeContext(operation.position, this.lexer.rawExpression)}`
                )
            } else if (right === null || right === undefined) {
                await FlowError.new(this.settings, SYNTAX, 
                    `You forgot to assign a value to a variable\n`+
                    `${getErrorCodeContext(operation.position, this.lexer.rawExpression)}`)
            }
            return new nodes.Assign(left, right, operation)
        } else {
            return node
        }
    }

    /**
     * if_statement: IF expression DO block ((ELSE else_statement)? | END) 
     */
    async ifStatement() {
        if (TokenType.IF === this.currentToken.tokenType) {
            let elseStatement = null

            await this.getNextToken(TokenType.IF)
            const expression = await this.expression()
            await this.getNextToken(TokenType.DO)
            const block = await this.block()

            if (TokenType.ELSE === this.currentToken.tokenType) {
                elseStatement = await this.elseStatement()
            } else {
                await this.getNextToken(TokenType.END)
            }
            return new nodes.IfStatement(expression, block, elseStatement)
        }
    }

    /**
     * else_statement: (ELSE DO block | ELSE IF if_statement) END
     */
    async elseStatement() {
        if (TokenType.ELSE === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.ELSE)
            if (TokenType.IF === this.currentToken.tokenType) {
                return await this.ifStatement()
            } else {
                await this.getNextToken(TokenType.DO)
                const node = await this.block()
                await this.getNextToken(TokenType.END)
                return node
            }
        }
    }

    /**
     * try_statement: TRY DO block ((CATCH catch_statement)? | END)
     */
    async tryStatement() {
        if (TokenType.TRY === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.TRY)
            await this.getNextToken(TokenType.DO)
            const block = await this.block()
            if (TokenType.CATCH === this.currentToken.tokenType) {
                const catchStatement = await this.catchStatement()
                return new nodes.TryStatement(block, catchStatement)
            } else {
                await this.getNextToken(TokenType.END)
                return new nodes.TryStatement(block)
            }
        }
    }

    /**
     * catch_statement: CATCH ((LEFT_PARENTHESIS)? variable (RIGHT_PARENTHESIS)?)? DO block END
     */
    async catchStatement() {
        if (TokenType.CATCH === this.currentToken.tokenType) {
            let variable = null
            await this.getNextToken(TokenType.CATCH)

            if (TokenType.LEFT_PARENTHESIS === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.LEFT_PARENTHESIS)
                if (TokenType.IDENTITY === this.currentToken.tokenType) {
                    variable = await this.variable()
                } else {
                    await FlowError.new(
                        this.settings, 
                        SYNTAX, 
                        `You must declare a variable to recieve the Error struct.\n`+
                        `${getErrorCodeContext(this.currentToken.position, this.lexer.rawExpression)}`
                    )
                }
                await this.getNextToken(TokenType.RIGHT_PARENTHESIS)
            } else if (TokenType.IDENTITY === this.currentToken.tokenType) {
                variable = await this.variable()
            }

            await this.getNextToken(TokenType.DO)
            const block = await this.block()
            await this.getNextToken(TokenType.END)
            return new nodes.CatchStatement(block, variable)
        }
    }

    /**
     * function_statement: FUNCTION (IDENTITY)? LEFT_PARENTHESIS (parameters)?* RIGHT_PARENTHESIS ((DO block END) | assignment)
     */
    async functionStatement() {
        if (TokenType.FUNCTION === this.currentToken.tokenType) {
            let functionBlock = null
            let functionVariable = null

            await this.getNextToken(TokenType.FUNCTION)

            if (TokenType.IDENTITY === this.currentToken.tokenType) {
                functionVariable = await this.variable()
            }

            await this.getNextToken(TokenType.LEFT_PARENTHESIS)

            const parameters = await this.parameters()

            await this.getNextToken(TokenType.RIGHT_PARENTHESIS)
            
            const isBlock = TokenType.DO === this.currentToken.tokenType
            if (isBlock) {
                await this.getNextToken(TokenType.DO)

                functionBlock = await this.block()

                await this.getNextToken(TokenType.END)
            } else {
                await this.getNextToken(TokenType.COLON)
                functionBlock = await this.assignment()
            }

            return new nodes.FunctionDefinition(functionVariable, parameters, functionBlock)
        }
    }

    /**
     * module_statement: MODULE IDENTITY (LEFT_PARENTHESIS (arguments)?* RIGHT_PARENTHESIS)? (DO module_block_statements_list END)?
     */
    async moduleStatement() {
        if (TokenType.MODULE === this.currentToken.tokenType) {
            let moduleVariable = null
            let moduleBlock = []
            let structParameters = null

            await this.getNextToken(TokenType.MODULE)

            if (TokenType.IDENTITY === this.currentToken.tokenType) {
                moduleVariable = await this.variable()
            }

            if (TokenType.LEFT_PARENTHESIS === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.LEFT_PARENTHESIS)

                structParameters = await this.parameters()

                await this.getNextToken(TokenType.RIGHT_PARENTHESIS)
            }

            if (TokenType.DO === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.DO)

                moduleBlock = await this.moduleBlockStatementsList()

                await this.getNextToken(TokenType.END)
            }

            return new nodes.ModuleDefinition(moduleVariable, structParameters, moduleBlock)
        }
    }

    /**
     * module_block_statements_list: (module_block_statement NEWLINE)* 
     */
    async moduleBlockStatementsList(instructions = []) {
        if (TokenType.END !== this.currentToken.tokenType) {
            const node = await this.moduleBlockStatement()
            if (node !== null && node !== undefined) {
                instructions.push(node)
            }
        }

        if (TokenType.NEWLINE === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.NEWLINE)
            return await this.moduleBlockStatementsList(instructions)
        } else {
            return instructions
        }
    }

    /**
     * module_block_statement: DOCUMENTATION documentation_statements
     *                         | named_statement
     *                         | IDENTITY (assignment)?
     */
    async moduleBlockStatement() {   
        await this.#ignoreNewline()

        let originalNode = null
        let namedStatementAssignmentOrVariableNode = null
        if (TokenType.DOCUMENTATION === this.currentToken.tokenType) {
            const node = await this.documentationStatements()
            originalNode = node
            namedStatementAssignmentOrVariableNode = node.value
        } else if (TokenType.IDENTITY === this.currentToken.tokenType) {
            const node = await this.assignment()
            originalNode = node
            namedStatementAssignmentOrVariableNode = node
        } else {
            const node = await this.namedStatements()
            originalNode = node
            namedStatementAssignmentOrVariableNode = node
        }

        const isValidNode = namedStatementAssignmentOrVariableNode !== undefined && 
            [NodeType.FUNCTION_DEFINITION, 
            NodeType.MODULE_DEFINITION, 
            NodeType.VARIABLE, 
            NodeType.ASSIGN].includes(namedStatementAssignmentOrVariableNode.nodeType)
        if (isValidNode) {
            if (namedStatementAssignmentOrVariableNode.nodeType === NodeType.ASSIGN) {
                return new nodes.ModuleLiteral(namedStatementAssignmentOrVariableNode.left, originalNode)
            } else if (namedStatementAssignmentOrVariableNode.nodeType === NodeType.VARIABLE) {
                return new nodes.ModuleLiteral(namedStatementAssignmentOrVariableNode, originalNode)
            } else {
                return new nodes.ModuleLiteral(namedStatementAssignmentOrVariableNode.variable, originalNode)
            }
        } else {
            await FlowError.new(
                this.settings, 
                SYNTAX, 
                `must be an assignment, a new module, a function or a variable\n`+
                `${getErrorCodeContext(this.currentToken.position-1, this.lexer.rawExpression)}`
            )
        }
    }
    
    /**
     * parameters: ((IDENTITY | assignment) POSITIONAL_ARGUMENT_SEPARATOR)*
     */
    async parameters(parametersArray=[]) {
        await this.#ignoreNewline()
        if (TokenType.IDENTITY === this.currentToken.tokenType) {
            const node = await this.assignment()
            if (NodeType.ASSIGN === node.nodeType || NodeType.VARIABLE === node.nodeType) {
                parametersArray.push(node)
                if(TokenType.POSITIONAL_ARGUMENT_SEPARATOR === this.currentToken.tokenType) {
                    await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
                    return await this.parameters(parametersArray)
                } else {
                    return new nodes.Parameters(parametersArray)
                }
            } else {
                await FlowError.new(
                    this.settings, 
                    SYNTAX, 
                    `You define parameters by defining an assignment or a variable.`)
            }
        } else if ([TokenType.RIGHT_PARENTHESIS].includes(this.currentToken.tokenType)) {
            return new nodes.Parameters(parametersArray)
        } else {
            await FlowError.new(
                this.settings, 
                SYNTAX,
                `You define parameters by defining an assignment or a variable.\n` +
                `${getErrorCodeContext(this.currentToken.position, this.lexer.rawExpression)}`
            )   
        }
    }

    /**
     * arguments: ((function_statement | expression) POSITIONAL_ARGUMENT_SEPARATOR)*
     */
    async arguments() {
        const argumentsArray = []
        while (TokenType.RIGHT_PARENTHESIS !== this.currentToken.tokenType) {
            let argument = null

            if (TokenType.FUNCTION === this.currentToken.tokenType) {
                argument = await this.functionStatement()
            } else {
                argument = await this.expression()
            }

            if (argument !== null && argument !== undefined) argumentsArray.push(argument)
            
            if (TokenType.POSITIONAL_ARGUMENT_SEPARATOR === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
            }
        }
        
        return argumentsArray
    }

    /**
     * expression: IF if_statement 
     *           | TRY try_statement
     *           | disjunction
     */
    async expression() {
        if (TokenType.IF === this.currentToken.tokenType) {
            return await this.ifStatement()
        } else if (TokenType.TRY === this.currentToken.tokenType) {
            return await this.tryStatement()
        } else {
            return await this.disjunction()
        }
    }

    /** 
     * disjunction: (disjunction ((OR) | disjunction)*
     *            | conjunction
     */
    async disjunction() {
        const node = await this.conjunction()

        if (TokenType.OR === this.currentToken.tokenType) {

            const operation = this.currentToken
            const left = node
            
            await this.getNextToken(this.currentToken.tokenType)

            const right = await this.disjunction()

            if ((left === null || left === undefined) || (right === null || right === undefined)) {
                await FlowError.new(
                    this.settings, 
                    SYNTAX, 
                    `Ops, looks like you forgot to finish the 'or' expression\n`+
                    `${getErrorCodeContext(operation.position, this.lexer.rawExpression)}`
                )
            }

            return new nodes.BooleanOperation(left, right, operation)
        } else {
            return node
        }
    }

    /**
     * conjunction: (conjunction ((AND) | conjunction)*
     *            | inversion
     */
    async conjunction() {
        const node = await this.inversion()

        if (TokenType.AND === this.currentToken.tokenType) {

            const operation = this.currentToken
            const left = node

            await this.getNextToken(this.currentToken.tokenType)

            const right = await this.conjunction()

            if ((left === null || left === undefined) || (right === null || right === undefined)) {
                await FlowError.new(
                    this.settings,
                    SYNTAX,
                    `Ops, looks like you forgot to finish the 'and' expression\n`+
                    `${getErrorCodeContext(this.currentToken.position, this.lexer.rawExpression)}`
                )
            }
            return new nodes.BooleanOperation(node, right, operation)
        } else {
            return node
        }
    }

    /**
     * inversion: NOT inversion
     *          | equal_comparison
     */
    async inversion() {
        const node = await this.equalComparion()

        if (TokenType.NOT === this.currentToken.tokenType) {
            const operation = this.currentToken
            
            await this.getNextToken(this.currentToken.tokenType)
            
            const value = await this.inversion()
            
            if (value === null || value === undefined) {
                await FlowError.new(
                    this.settings, 
                    SYNTAX, 
                    `You forgot to close the 'not' operator\n`+
                    `${getErrorCodeContext(this.currentToken.position, this.lexer.rawExpression)}`
                )
            }
            return new nodes.UnaryConditional(operation, value)
        } else {
            return node
        }
    }

    /**
     * equal_comparison: equal_comparison (( GREATER_THAN_EQUAL | LESS_THAN_EQUAL | EQUAL | DIFFERENT) equal_comparison)* 
     *                 | comparison
     */
    async equalComparion() {
        const node = await this.comparison()

        if ([
            TokenType.GREATER_THAN_EQUAL,
            TokenType.DIFFERENT,
            TokenType.LESS_THAN_EQUAL,
            TokenType.EQUAL
        ].includes(this.currentToken.tokenType)) {
            const operation = this.currentToken
            const left = node
            
            await this.getNextToken(this.currentToken.tokenType)
            
            const right = await this.equalComparion()

            if ((left === null || left === undefined) || (right === null || right === undefined)) {
                await FlowError.new(this.settings, SYNTAX, "In your comparison, one of the values is wrong")
            }

            return new nodes.BinaryConditional(left, right, operation)
        } else {
            return node
        }
    }
    /**
     * comparison: comparison (( GREATER_THAN | LESS_THAN | IN) comparison)* 
     *           | add
     */
    async comparison() {
        const node = await this.add()

        if ([
            TokenType.GREATER_THAN, 
            TokenType.LESS_THAN,
            TokenType.IN
        ].includes(this.currentToken.tokenType)) {
            const operation = this.currentToken
            const left = node
            
            await this.getNextToken(this.currentToken.tokenType)
            
            const right = await this.comparison()

            if ((left === null || left === undefined) || (right === null || right === undefined)) {
                await FlowError.new(this.settings, SYNTAX, "In your comparison, one of the values is wrong")
            }

            return new nodes.BinaryConditional(left, right, operation)
        } else {
            return node
        }
    }

    /**
     * add: add ((PLUS | MINUS) add)*
     *    | product
     */
    async add() {
        const node = await this.product()

        if ([
            TokenType.SUM, 
            TokenType.SUBTRACTION
        ].includes(this.currentToken.tokenType)) {
            const operation = this.currentToken
            const left = node
            
            await this.getNextToken(this.currentToken.tokenType)
            
            const right = await this.add()
            
            return new nodes.BinaryOperation(left, right, operation)
        } else {
            return node
        }
    }

    /**
     * product: product ((MULTIPLACATION | DIVISION | REMAINDER) product)*
     *        | power
     */
    async product() {
        const node = await this.power()

        if ([
            TokenType.DIVISION, 
            TokenType.REMAINDER, 
            TokenType.MULTIPLICATION
        ].includes(this.currentToken.tokenType)) {
            const operation = this.currentToken
            const left = node
            
            await this.getNextToken(this.currentToken.tokenType)
            
            const right = await this.product()
            
            return new nodes.BinaryOperation(left, right, operation)
        } else {
            return node
        }
    }

    /**
     * power: power ((POWER) product)*
     *      | unary
     */
    async power() {
        const node = await this.unary()

        if (TokenType.POWER === this.currentToken.tokenType) {
            const operation = this.currentToken
            const left = node
            
            await this.getNextToken(TokenType.POWER)

            const right = await this.product()

            return new nodes.BinaryOperation(left, right, operation)
        } else {
            return node
        }
    }
    /**
     * unary: (SUM | SUBTRACTION) unary
     *      | primary
     */
    async unary() {
        if ([
            TokenType.SUM,
            TokenType.SUBTRACTION,
        ].includes(this.currentToken.tokenType)) {
            const operation = this.currentToken

            await this.getNextToken(this.currentToken.tokenType)

            const value = await this.unary()

            return new nodes.UnaryOperation(operation, value)
        } else {
            return await this.primary()
        }
    }

    /**
     * primary: simple_statements
     *        | atom
     *        | struct
     *        | (slice)*
     *        | (attribute)*
     *        | (function_call)*
     * 
     * attribute: primary ATTRIBUTE IDENTITY
     * 
     * slice: primary LEFT_BRACKET (atom (POSITIONAL_ARGUMENT_SEPARATOR atom)*)? RIGHT_BRACKET
     * 
     * struct: LEFT_BRACES (statement (COMMA statement)*)? RIGHT_BRACES
     * 
     * function_call: primary LEFT_PARENTHESIS (statement (POSITIONAL_ARGUMENT_SEPARATOR statement)*)? RIGHT_PARENTHESIS
     */
    async primary() {
        let node = await this.simpleStatements()
        
        if (node === null || node === undefined) {
            node = await this.atom()
        }

        while ([TokenType.ATTRIBUTE, TokenType.LEFT_BRACKETS, TokenType.LEFT_PARENTHESIS, TokenType.LEFT_BRACES].includes(this.currentToken.tokenType)) {
            // attribute
            if (TokenType.ATTRIBUTE === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.ATTRIBUTE)
                const rightValue = this.currentToken
                await this.getNextToken(TokenType.IDENTITY)
                node = new nodes.Attribute(node, rightValue)
            } 

            // slice
            if (TokenType.LEFT_BRACKETS === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.LEFT_BRACKETS)
                node = new nodes.Slice(node, await this.expression())
                await this.getNextToken(TokenType.RIGHT_BRACKETS)
            } 

            // function_call
            if (TokenType.LEFT_PARENTHESIS === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.LEFT_PARENTHESIS)
                let functionArguments = []

                while (![TokenType.END_OF_FILE, TokenType.RIGHT_PARENTHESIS].includes(this.currentToken.tokenType)) {
                    await this.#ignoreNewline()
                    const argument = await this.statement()                    
                    await this.#ignoreNewline()

                    functionArguments.push(argument)
                    if (TokenType.POSITIONAL_ARGUMENT_SEPARATOR === this.currentToken.tokenType) {
                        await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
                    } else if (![TokenType.END_OF_FILE, TokenType.RIGHT_PARENTHESIS].includes(this.currentToken.tokenType)) {
                        await this.getNextToken(this.currentToken.tokenType)
                    }
                }

                await this.getNextToken(TokenType.RIGHT_PARENTHESIS)
                node = new nodes.FunctionCall(node, functionArguments)
            }
            
            // structs
            if (TokenType.LEFT_BRACES === this.currentToken.tokenType) {
                await this.getNextToken(TokenType.LEFT_BRACES)

                let structArguments = []

                while (TokenType.RIGHT_BRACES !== this.currentToken.tokenType) {
                    await this.#ignoreNewline()
                    const argument = await this.statement()
                    await this.#ignoreNewline()

                    structArguments.push(argument)

                    if (TokenType.POSITIONAL_ARGUMENT_SEPARATOR === this.currentToken.tokenType) {
                        await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
                    } else if (TokenType.RIGHT_BRACES !== this.currentToken.tokenType) {
                        await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
                    }
                    await this.#ignoreNewline()
                }

                await this.getNextToken(TokenType.RIGHT_BRACES)
                node = new nodes.Struct(node, structArguments)
            }
        }
        
        return node
    }

    /** 
     * atom: INTEGER 
     *     | FLOAT 
     *     | STRING
     *     | BOOLEAN
     *     | DATETIME
     *     | variable
     *     | LEFT_PARENTHESIS expression RIGHT_PARENTHESIS
     *     | LEFT_BRACES dict
     *     | LEFT_BRACKET array 
     */
    async atom() {
        const currentToken = this.currentToken

        if (TokenType.LEFT_BRACKETS === this.currentToken.tokenType) {
            return await this.array()
        } else if (TokenType.LEFT_BRACES === this.currentToken.tokenType) {
            return await this.dicts()
        } else if (TokenType.BOOLEAN === this.currentToken.tokenType) {
            const node = new nodes.BooleanNode(currentToken)

            await this.getNextToken(TokenType.BOOLEAN)

            return node
        } else if (TokenType.INTEGER === this.currentToken.tokenType) {
            const node = new nodes.IntegerNode(currentToken)

            await this.getNextToken(TokenType.INTEGER)

            return node
        } else if (TokenType.DATETIME === this.currentToken.tokenType) {
            const node = new nodes.DatetimeNode(currentToken)

            await this.getNextToken(TokenType.DATETIME)

            return node
        } else if (TokenType.NULL === this.currentToken.tokenType) {
            const node = new nodes.NullNode(currentToken)

            await this.getNextToken(TokenType.NULL)

            return node
        } else if (TokenType.STRING === this.currentToken.tokenType) {
            const node = new nodes.StringNode(currentToken)
            
            await this.getNextToken(TokenType.STRING)

            return node
        } else if (TokenType.FLOAT === this.currentToken.tokenType) {
            const node = new nodes.FloatNode(currentToken)

            await this.getNextToken(TokenType.FLOAT)

            return node
        } else if (TokenType.LEFT_PARENTHESIS === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.LEFT_PARENTHESIS)

            const node = await this.statement()

            await this.getNextToken(TokenType.RIGHT_PARENTHESIS)

            return node
        } else if (TokenType.IDENTITY === this.currentToken.tokenType) {
            return await this.variable()
        }
    }

    /**
     * variable: IDENTITY
     */
    async variable() {
        if (TokenType.IDENTITY === this.currentToken.tokenType) {
            const node = new nodes.Variable(this.currentToken)

            await this.getNextToken(TokenType.IDENTITY)

            return node
        }
    }

    /**
     * array: LEFT_BRACKET (expression | function_statement) (POSITIONAL_ARGUMENT_SEPARATOR (expression | named_statements))* RIGHT_BRACKET
     */
    async array() {
        let members = []
        if (TokenType.LEFT_BRACKETS === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.LEFT_BRACKETS)
            
            while (TokenType.RIGHT_BRACKETS !== this.currentToken.tokenType) {
                let node = await this.namedStatements()
                await this.#ignoreNewline()

                if (node === undefined) {
                    node = await this.expression()
                }

                await this.#ignoreNewline()
                if (TokenType.POSITIONAL_ARGUMENT_SEPARATOR === this.currentToken.tokenType) {
                    await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
                } else if (TokenType.RIGHT_BRACKETS !== this.currentToken.tokenType) {
                    await this.getNextToken(TokenType.RIGHT_BRACKETS)
                }
                await this.#ignoreNewline()
                
                if (node !== null && node !== undefined) {
                    members.push(node)
                }
            }

            await this.getNextToken(TokenType.RIGHT_BRACKETS)
            return new nodes.List(members)
        }
    }

    /**
     * dict: LEFT_BRACES atom COLON (expression | function_statement) (POSITIONAL_ARGUMENT_SEPARATOR atom COLON (expression | named_statements))* RIGHT_BRACES
     */
    async dicts() {
        let members = []

        if (TokenType.LEFT_BRACES === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.LEFT_BRACES)

            while (TokenType.RIGHT_BRACES !== this.currentToken.tokenType) {
                let value = null

                await this.#ignoreNewline()
                const key = await this.atom()
                await this.#ignoreNewline()

                await this.getNextToken(TokenType.COLON)
                await this.#ignoreNewline()

                
                value = await this.namedStatements()
                if (value === undefined) {
                    value = await this.expression()
                }

                await this.#ignoreNewline()

                if (value !== null && value !== undefined) {
                    members.push([key, value])
                }

                if (TokenType.POSITIONAL_ARGUMENT_SEPARATOR === this.currentToken.tokenType) {
                    await this.getNextToken(TokenType.POSITIONAL_ARGUMENT_SEPARATOR)
                } else if (TokenType.RIGHT_BRACES !== this.currentToken.tokenType) {
                    await this.getNextToken(TokenType.RIGHT_BRACES)
                }

                await this.#ignoreNewline()
            }

            await this.getNextToken(TokenType.RIGHT_BRACES)

            return new nodes.Dict(members)
        }
    }

    /**
     * Newlines are important tokens for flow. Different from languages like Javascript or Rust, and more similar to languages
     * like Elixir, Ruby or Python we evaluate the next chunk of code when we encounter a newline.
     * 
     * In languages like Rust we delimit that the block of code has reached it's end when we encounter a ';'
     * 
     * Because of that sometimes we want to ignore newlines. So the user can write stuff spanning multiple lines like arrays
     * dicts and so on. So we use this to ignore all of the newline tokens when the newline is not important.
     */
    async #ignoreNewline() {
        while (TokenType.NEWLINE === this.currentToken.tokenType) {
            await this.getNextToken(TokenType.NEWLINE)
        }
    }
}

module.exports = Parser