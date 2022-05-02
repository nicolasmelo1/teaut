/** @module src/formula/utils/settings */

const Context = require('./context')
const { DatetimeHelper } = require('./helpers')


class TokenType {
    static ASSIGN = 'ASSIGN'
    static INTEGER = 'INTEGER'
    static FLOAT = 'FLOAT'
    static BOOLEAN = 'BOOLEAN'
    static DATETIME='DATETIME'
    static POSITIONAL_ARGUMENT_SEPARATOR = 'POSITIONAL_ARGUMENT_SEPARATOR'
    static STRING = 'STRING'
    static FUNCTION = 'FUNCTION'
    static MODULE = 'MODULE'
    static LEFT_PARENTHESIS = 'LEFT_PARENTHESIS'
    static LEFT_BRACES = 'LEFT_BRACES'
    static LEFT_BRACKETS = 'LEFT_BRACKETS'
    static RIGHT_PARENTHESIS = 'RIGHT_PARENTHESIS'
    static RIGHT_BRACES = 'RIGHT_BRACES'
    static RIGHT_BRACKETS = 'RIGHT_BRACKETS'
    static GREATER_THAN_EQUAL = 'GREATER_THAN_EQUAL'
    static LESS_THAN_EQUAL = 'LESS_THAN_EQUAL'
    static NULL = 'NULL'
    static COMMENT = 'COMMENT'
    static DIFFERENT = 'DIFFERENT'
    static LESS_THAN = 'LESS_THAN'
    static GREATER_THAN = 'GREATER_THAN'
    static DIVISION = 'DIVISION'
    static REMAINDER = 'REMAINDER'
    static SUBTRACTION = 'SUBTRACTION'
    static SUM = 'SUM'
    static MULTIPLICATION = 'MULTIPLICATION'
    static POWER = 'POWER'
    static COLON = 'COLON'
    static DOT = 'DOT'
    static EQUAL = 'EQUAL'
    static NOT = 'NOT'
    static OR = 'OR'
    static AND = 'AND'
    static END_OF_FILE = 'END_OF_FILE'
    static NEWLINE = 'NEWLINE'
    static IDENTITY = 'IDENTITY'
    static DO = 'DO'
    static END = 'END'
    static IN = 'IN'
    static IF = 'IF'
    static ELSE = 'ELSE'
    static TRY = 'TRY'
    static CATCH = 'CATCH'
    static RAISE = 'RAISE'
    static RETURN = 'RETURN'
    static ATTRIBUTE = 'ATTRIBUTE'
    static DOCUMENTATION = 'DOCUMENTATION'
}
 
class NodeType {
    static STRUCT = 'STRUCT'
    static PROGRAM = 'PROGRAM'
    static PARAMETERS = 'PARAMETERS'
    static IF_STATEMENT = 'IF_STATEMENT'
    static BINARY_OPERATION = 'BINARY_OPERATION'
    static BINARY_CONDITIONAL = 'BINARY_CONDITIONAL'
    static INTEGER = 'INTEGER'
    static FORMULA = 'FORMULA'
    static FLOAT = 'FLOAT'
    static STRING = 'STRING'
    static DATETIME = 'DATETIME'
    static BOOLEAN = 'BOOLEAN'
    static NULL = 'NULL'
    static UNARY_OPERATION = 'UNARY_OPERATION'
    static UNARY_CONDITIONAL = 'UNARY_CONDITIONAL'
    static BOOLEAN_OPERATION = 'BOOLEAN_OPERATION'
    static BLOCK = 'BLOCK'
    static ASSIGN = 'ASSIGN'
    static VARIABLE = 'VARIABLE'
    static MODULE_DEFINITION = 'MODULE_DEFINITION'
    static MODULE_LITERAL = 'MODULE_LITERAL'
    static FUNCTION_DEFINITION = 'FUNCTION_DEFINITION'
    static FUNCTION_CALL = 'FUNCTION_CALL'
    static LIST = 'LIST'
    static DICT = 'DICT'
    static SLICE = 'SLICE'
    static ATTRIBUTE = 'ATTRIBUTE'
    static RAISE = 'RAISE'
    static RETURN = 'RETURN'
    static TRY_STATEMENT = 'TRY_STATEMENT'
    static CATCH_STATEMENT = 'CATCH_STATEMENT'
    static DOCUMENTATION = 'DOCUMENTATION'
}

/**
 * This is the settings class, this is used on the interpreter, parser and lexer.
 * The idea is that with the settings we are able to translate the formula or in other words, the programming language,
 * how we actually want. 
 * 
 * This way, people in Brazil, in United States or Europe can adapt the formulas the way it fits them most.
 * For example, in some places like Brazil float numbers are written with ',' as the decimal separator. In others like
 * the United States, '.' is prefered.
 * 
 * Settings is an object that needs to be passed arround inside of flow. You create a single Settings instance before running your flow script
 * and then pass it around. You will see that the interpreter, parser and lexer, all of them, recieves the settings instance.
 * 
 * In the interpreter you will see that all of the Flow objects like strings, Float, Structs and so on recieves the settings object. Even the default bultin library 
 * recieves the settings class, that's because we need it to know what we should do.
 * 
 * This is actually one of the main differences that makes Flow what it is. We bound the evaluation to a context, this way we can keep it easy to manage.
 * 
 * WHY DO YOU NOT CREATE A GLOBAL SETTINGS?
 * Because of the context. If this was a language running in someones computer we wouldn't need to do this but since this is a single server and 
 * will probably need to handle multiple requests the Settings will change for each user. So we need to pass this instance around. That's the "easiest" way to handle this.
 * 
 * WHY NOT USE CONTEXT DIRECTLY SINCE IT'S BASICALLY THE SAME?
 * THe Context object is a class that holds another classes/objects. It works like the Facade Pattern for my understanding (i don't know much about them). Because of this, Context
 * can change the code more often than Settings, here we have a more structured way of defining the values that will not change often. Also this can hold other stuff that
 * is not context related but more general functions/methods on how the language work.
 * 
 * Since this is passed around, you can add multiple handy methods here. But try to keep it as clean as possible. See that instead of context.keyword.inversion we use 
 * inversionKeyword attribute only, so it's a simple flat key to check. This make it easier to retrieve stuff when needed. 
 */
class Settings {
    /**
     * @param {import('./context')} [context=Context] - The context class so we can translate flow in other languages like portuguese, spanish, italian and so on.
     * @param {boolean} [isTesting=false] - If we are just testing the flow code and is not running in production set this to true
     */
    constructor(context = new Context(), isTesting = false) {
        this.isTesting = isTesting
        this.maxCallStackSize = 99
        this.sigilString = '~'
        this.attributeCharacter = '.'
        this.commentCharacter = '#'
        this.stringDelimiters = ['`', '"', "'"]
        this.operationCharacters = ['>' ,'<', '=', '!', '/', '+', '*', '%', '-', '^', ':']
        this.validNumbersCharacters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        this.validBraces = ['{', '}', '(', ')', '[', ']']
        this.timezone = context.datetime.timezone
        this.datetimeHelper = new DatetimeHelper()
        this.language = context.languageContext
        this.attributesLabel = context.attributesLabel
        
        this.reflowAutomationActionData = context.reflow.automation.actionData
        this.reflowAutomationTriggerData = context.reflow.automation.triggerData
        this.reflowAutomationDebugTrigger = context.reflow.automation.debugTrigger
        this.reflowAutomationId = context.reflow.automation.id
        this.reflowCompanyId = context.reflow.companyId
        this.reflowUserId = context.reflow.userId
        this.reflowDynamicFormId = context.reflow.formula.dynamicFormId

        this.specialModuleMethods = context.specialModuleMethods

        this.tailCallOptimizedMessage = context.tailCallOptimizedMessage
        this.datetimeDateCharacter = context.datetime.dateCharacter
        this.datetimeDateFormat = context.datetime.dateFormat
        this.datetimeTimeFormat = context.datetime.timeFormat
        this.positionalArgumentSeparator = context.positionalArgumentSeparator
        this.decimalPointCharacter = context.decimalPointSeparator
        this.inversionKeyword = context.keyword.inversionKeyword
        this.includesKeyword = context.keyword.includesKeyword
        this.equalityKeyword = context.keyword.equalityKeyword
        this.inequalityKeyword = context.keyword.inequalityKeyword
        this.disjunctionKeyword = context.keyword.disjunctionKeyword
        this.conjunctionKeyword = context.keyword.conjunctionKeyword
        this.functionKeyword = context.keyword.functionKeyword
        this.moduleKeyword = context.keyword.moduleKeyword
        this.nullKeyword = context.keyword.nullKeyword
        this.returnKeyword = context.keyword.returnKeyword
        this.documentationKeyword = context.keyword.documentationKeyword
        this.errorKeywords = {
            'try': context.keyword.errorContext.tryKeyword,
            'catch': context.keyword.errorContext.catchKeyword,
            'raise': context.keyword.errorContext.raiseKeyword,
        }
        this.blockKeywords = {
            'do': context.keyword.blockContext.doKeyword,
            'end': context.keyword.blockContext.endKeyword
        }
        this.ifKeywords = {
            'if': context.keyword.ifContext.ifKeyword,
            'else': context.keyword.ifContext.elseKeyword
        }
        this.booleanKeywords = {
            'true': context.keyword.booleanContext.trueKeyword,
            'false': context.keyword.booleanContext.falseKeyword
        }
        this.library = context.library
        this.modulesToRuntime = context.modulesToRuntime
    }

    /**
     * This needs to live here and not in the helper because this is a helper that uses the data from the context.
     * Also this caches the format of the context so we don't need to re-evaluate everytime. What this does is that, given a time format
     * like HH:mm:ss, it will return a string with the regex so that we can evaluate like from this:
     * ```
     * 'HH:mm:ss'
     * // to this
     * `((0[1-9]|1[0-2]|[1-9]))([:])?(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])?([:])?(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])?`
     * ```
     * This regex will be used to validate a given time in flow. Then we cache this value so if we need to regenerate this bigass regex
     * we will have it saved.
     * 
     * _IMPORTANT_: Every part of the time format is optional, and not obligatory, the user can type ~D[2020-10-01] and that will be translated to
     * ~D[2020-10-01 00:00:00]. The user can also type ~D[2020-10-01 10] and that will be understood as ~D[2020-10-01 10:00:00]. Last but not least
     * if the user types  ~D[2020-10-01 10:20] this will be translated to ~D[2020-10-01 10:20:00].
     * 
     * @param {boolean} [matchTheFormat=false] - If this is set to true, in the example above, instead of returning the regex above, we will generate a regex
     * like this:
     * ```
     * `(HH)([:])?(mm)?([:])?(ss)?`
     * ```
     * This will match directly on the date formating so we can transcribe the value that was found by the above regex to the actual position of the value.
     * This means that the thing that is found on this part of the regex ((0[1-9]|1[0-2]|[1-9])) will live on the (HH) part of the time value. 
     * That's how we parse the time value.
     * 
     * @returns {Promise<string>} - The regex to use to validate a given time. Can be used to match the time format. Or the regex to match from the actual value.
     */
    async timeFormatToRegex(matchTheFormat=false) {
        if (matchTheFormat === true && this.cachedDatetimeTimeFormatRegex) return this.cachedDatetimeTimeFormatRegex

        let timeFormat = this.datetimeTimeFormat
        // these is for characters like ':', 'A', 'P', 'M', and '-' and so on. It's characters that are not on the validFormats array.
        let charactersThatDoesntMeanAnything = this.datetimeTimeFormat
        for (const partOfTimeFormat of this.datetimeHelper.validFormats) {
            timeFormat = timeFormat.replaceAll(partOfTimeFormat, matchTheFormat ? `(${partOfTimeFormat})` : await this.datetimeHelper.getRegex(partOfTimeFormat))
            charactersThatDoesntMeanAnything = charactersThatDoesntMeanAnything.replaceAll(partOfTimeFormat, '')
        }

        charactersThatDoesntMeanAnything = new Set(charactersThatDoesntMeanAnything)
        charactersThatDoesntMeanAnything = [...charactersThatDoesntMeanAnything]
        const forRegex = charactersThatDoesntMeanAnything.map(character => `\\${character}`).join('')
        const otherStringsRegex = `([${forRegex}])`
        timeFormat = timeFormat.replace(new RegExp(otherStringsRegex, 'g'), () => (`${otherStringsRegex}?`))
        
        if (matchTheFormat === true) this.cachedDatetimeTimeFormatRegex = timeFormat
        return timeFormat
    }

    /**
     * It is basically the same as `.timeFormatToRegex` but simpler because on the time format every part of the date is obligatory.
     * As said before the user can type parts of the time and that will be understood, but at the same time he needs to write the date completly.
     * ~D[2020] for example will not be understood. So the user needs to type ~D[2020-10-01] or ~D[2020-10-01 10:20:30] or ~D[2020-10-01 10:20] so we
     * can understand that it is a date.
     * 
     * The regex and generated and the matchTheFormat argument has the same functionality as the `.timeFormatToRegex` function so we won't go in detail
     * here.
     * 
     * @param {boolean} [matchTheFormat=false] - If this is set to true, instead of returning the regex matching the actual values like numbers, we will generate a regex
     * that match the actual date format like `(YYYY)([-])(MM)?([-])(DD)`
     * 
     * @returns {Promise<string>} - The regex to use to validate a given date. Can be used to match the date format. Or the regex to match from the actual value.
     */
    async dateFormatToRegex(matchTheFormat=false) {
        if (matchTheFormat === true && this.cachedDatetimeDateFormatRegex) return this.cachedDatetimeDateFormatRegex
        
        let dateFormat = this.datetimeDateFormat
        for (const partOfDateFormat of this.datetimeHelper.validFormats) {
            dateFormat = dateFormat.replaceAll(partOfDateFormat, matchTheFormat ? `(${partOfDateFormat})` : await this.datetimeHelper.getRegex(partOfDateFormat))
        }

        if (matchTheFormat === true) this.cachedDatetimeDateFormatRegex = dateFormat
        return dateFormat
    }

    /**
     * Initializes all of the builtin libraries so the user can use them inside of flow. Like HTTP, SMTP, List, String, and so on.
     * 
     * This will make all of those libraries avaialble for the end user when running a flow code. So they can simply type `HTTP.post()` and 
     * it will evaluate and work. You don't need to import anything or using external packages or any of those stuff.
     * 
     * IMPORTANT: Obviously this will make the language feel slower because it will loop through all of the libraries and initialize them to the user.
     * Instead of taking this out, which will be definetly not a good idea, it would be nice to focus on trying to compile the language, this will speed up
     * A LOT the process of running a program.
     * 
     * @param {import('./memory/record')} scope - The actual scope of flow.
     */
    async initializeBuiltinLibrary(scope) {
        for (const {moduleClass, moduleName} of this.modulesToRuntime) {
            const builtinModule = new moduleClass(this, moduleName, scope)
            const moduleContext = this.library[moduleName] 
            const realModuleName = moduleContext === undefined ? builtinModule.moduleName : moduleContext.moduleName
            await scope.assign(realModuleName, builtinModule)
        }
    }
    
    /**
     * Validates if a given character is a valid character to be used in identity in flow. Flow only accept words or _ in indentity values
     * if you are not understanding, identity is variables. You can't write a variable like `my.variable` in flow, you also can't write
     * `my-variable` only `my_variable` or `myVariable` or `myVariable123` is valid. See that this checks for every word inside flow.
     * Since flow is supposed to be translated, you can also write accents in variables like `novaAção`.
     * 
     * Reference: https://stackoverflow.com/a/26900132 (added underline to the end of it so it is also a possible character)
     * 
     * @param {string} character - The character to validate if it is valid as an identity.
     * 
     * @returns {boolean} - If the character is a valid character to be used as flow identity then return true, otherwise return false.
     */
    validateCharacterForIdentityOrKeywords(character) {
        return (typeof character === 'string' || character instanceof String) ?  /[A-Za-zÀ-ÖØ-öø-ÿ0-9_]/.test(character) : false
    }

    retrieveExpectedCharacterFromToken(token, value) {
        switch(token) {
            case TokenType.ASSIGN:
                return `'=' or '<-'`
            case TokenType.INTEGER:
                return 'a number without decimals'
            case TokenType.FLOAT:
                return 'a number with decimals'
            case TokenType.STRING:
                return 'a string, for example: "This is a string"'
            case TokenType.BOOLEAN:
                return `${this.booleanKeywords['true']} or ${this.booleanKeywords['false']}`
            case TokenType.DATETIME:
                return `a date or datetime`
            case TokenType.POSITIONAL_ARGUMENT_SEPARATOR:
                return `'${this.positionalArgumentSeparator}'`
            case TokenType.FUNCTION:
                return `'${this.functionKeyword}'`
            case TokenType.MODULE:
                return `'${this.moduleKeyword}'`
            case TokenType.LEFT_PARENTHESIS:
                return `'('`
            case TokenType.RIGHT_PARENTHESIS:
                return `')'`
            case TokenType.LEFT_BRACKETS:
                return `'['`
            case TokenType.RIGHT_BRACKETS:
                return `']'`
            case TokenType.LEFT_BRACES:
                return `'{'`
            case TokenType.RIGHT_BRACES:
                return `'}'`
            case TokenType.NULL:
                return `'${this.nullKeyword}'`
            case TokenType.END:
                return `'${this.blockKeywords['end']}'`
            case TokenType.DO:
                return `'${this.blockKeywords['do']}'`
            case TokenType.GREATER_THAN_EQUAL:
                return `'>='`
            case TokenType.LESS_THAN_EQUAL:
                return `'<='`
            case TokenType.NULL:
                return `'${this.nullKeyword}'`
            case TokenType.DIFFERENT:
                return `!=`
            case TokenType.LESS_THAN:
                return `'<'`
            case TokenType.GREATER_THAN:
                return `'>'`
            default:
                return `'${value}'`
        }   
         /*
        static GREATER_THAN_EQUAL = 'GREATER_THAN_EQUAL'
        static LESS_THAN_EQUAL = 'LESS_THAN_EQUAL'
        static NULL = 'NULL'
        static COMMENT = 'COMMENT'
        static DIFFERENT = 'DIFFERENT'
        static LESS_THAN = 'LESS_THAN'
        static GREATER_THAN = 'GREATER_THAN'
        static DIVISION = 'DIVISION'
        static REMAINDER = 'REMAINDER'
        static SUBTRACTION = 'SUBTRACTION'
        static SUM = 'SUM'
        static MULTIPLICATION = 'MULTIPLICATION'
        static POWER = 'POWER'
        static COLON = 'COLON'
        static DOT = 'DOT'
        static EQUAL = 'EQUAL'
        static NOT = 'NOT'
        static OR = 'OR'
        static AND = 'AND'
        static END_OF_FILE = 'END_OF_FILE'
        static NEWLINE = 'NEWLINE'
        static IDENTITY = 'IDENTITY'
        static IN = 'IN'
        static IF = 'IF'
        static ELSE = 'ELSE'
        static TRY = 'TRY'
        static CATCH = 'CATCH'
        static RAISE = 'RAISE'
        static RETURN = 'RETURN'
        static ATTRIBUTE = 'ATTRIBUTE'
        static DOCUMENTATION = 'DOCUMENTATION'
        }
        */
    }
}


module.exports = {
    TokenType,
    NodeType,
    Settings
}