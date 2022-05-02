/** @module src/formula/utils/context */


/**
 * In flow there are many special methods inside of the objects that handle many things. In order to be fully translatable
 * those special methods needs to be translated also.
 * 
 * This is similar to python dunder methods, but works only for structs so we can enable a kind of metaprogramming that is 
 * easier to understand. Less permisive than macros, but easier to understand and override.
 * 
 * For it's usage you can check on './bulitins/object/struct.js' for reference.
 */
class SpecialModuleMethodsContext {
    constructor({ _initialize_='__initialize__', _getattribute_='__getattribute__', _setattribute_='__setattribute__', 
                  _getitem_='__getitem__', _setitem_='__setitem__', _add_='__add__', _subtract_='__subtract__',
                  _divide_='__divide__', _remainder_= '__remainder__', _multiply_='__multiply__', _power_='__power__',
                  _in_='__in__', _equals_='__equals__', _difference_='__difference__', _lessthan_='__lessthan__', _lessthanequal_='__lessthanequal__',
                  _greaterthan_='__greaterthan__', _greaterthanequal_='__greaterthanequal__', _boolean_='__boolean__', _not_='__not__', 
                  _and_='__and__', _or_='_or_', _unaryplus_='_unaryplus_', _unaryminus_='_unaryminus_',
                  _string_='__string__', _json_='__json__', _hash_='__hash__', _length_='__length__', _call_='__call__'
                } = {}) {
        this._initialize_ = _initialize_
        this._getattribute_ = _getattribute_
        this._setattribute_ = _setattribute_
        this._getitem_ = _getitem_
        this._setitem_ = _setitem_
        this._add_ = _add_
        this._subtract_ = _subtract_
        this._divide_ = _divide_
        this._remainder_ = _remainder_
        this._multiply_ = _multiply_
        this._power_ = _power_
        this._in_ = _in_
        this._equals_ = _equals_
        this._difference_ = _difference_
        this._lessthan_ = _lessthan_
        this._lessthanequal_ = _lessthanequal_
        this._greaterthan_ = _greaterthan_
        this._greaterthanequal_ = _greaterthanequal_
        this._boolean_ = _boolean_
        this._not_ = _not_
        this._and_ = _and_
        this._or_ = _or_
        this._unaryplus_ = _unaryplus_
        this._unaryminus_ = _unaryminus_
        this._string_ = _string_
        this._json_ = _json_
        this._hash_ = _hash_
        this._length_ = _length_
        this._call_ = _call_
    }
}

/**
 * This will represent the structs of the builtin library functions, for example. HTTP returns a Response struct.
 * This struct can also be translated to something more meaningful for non english speakers like `Resposta` for example.
 * Usualy this will be used more for documentation that a real use inside of flow, but it's a nice touch.
 */
class BuiltinLibraryStructContext {
    /**
     * @param {string} structName - THe translated name of the struct. On the example above this will be `Resposta`.
     */
    constructor(structName) {
        this.structName = structName
        this.attributes = {}
    }

    /**
     * Adds a new attribute to the struct so each attribute from the struct can also be translated.
     * 
     * @param {string} originalAttributeName - The original name of the attribute.
     * @param {string} attributeNameTranslation - The translated name of the attribute.
     */
    addAttribute(originalAttributeName, attributeNameTranslation) {
        this.attributes[originalAttributeName] = attributeNameTranslation
    }
}

/**
 * This will represent all of the methods that a specific module has. Like HTTP can have the `post`, `get`, `request` and so
 * on methods. This will represent each one of them.
 * This context is also responsible for adding parameters to the methods so we can translate them as we wish.
 */
class BuiltinLibraryMethodContext {
    /**
     * @param {string} methodName - The translated name of the method.
     * @param {string} description - The description of the method.
     */
    constructor(methodName, description) {
        this.methodName = methodName
        this.description = description
        this.parameters = {}
    }

    /**
     * Adds a new parameter to the method so we can start translating the parameters of the methods.
     * 
     * @param {string} originalParameterName - The original name of the parameter, the english word.
     * @param {string} parameterNameTranslation - The translated name of the parameter, can be from whatever language you want.
     */
    addParameter(originalParameterName, parameterNameTranslation) {
        this.parameters[originalParameterName] = parameterNameTranslation
    }
}

/**
 * Context for defining modules inside of flow. Modules are more like bultin functions that we will enable the users
 * to use when using flow language. Like Elixir have the Enum module or the Kernel module already defined in runtime we 
 * will have modules like `HTTP`, `String`, `Number` and so on to work with everything inside of flow.
 * Everything from the modules like it's methods, structs, and eve attributes and parameters can be transalated to a common
 * language like portuguese or english or whatever we want.
 */
class BultinLibraryModuleContext {
    /**
     * @param {string} moduleName - The translated name of the module, not the original one.
     * @param {string} description - The description of the module.
     */
    constructor(moduleName, description) {
        this.moduleName = moduleName
        this.description = description
        this.structParameters = {}
        this.methods = {}
        this.structs = {}
    }

    /**
     * Adds a new method to the module that the module supports.
     * 
     * @param {string} originalMethodName - The original name of the method.
     * @param {string} methodNameTranslation - The translated name of the method.
     * @param {string} [description=''] - The description of the method.
     * 
     * @returns {BuiltinLibraryMethodContext} - Returns a new BuiltinLibraryMethodContext instance so you can use
     * it to add the parameters of the method.
     */
    addMethod(originalMethodName, methodNameTranslation, description='') {
        const newLibraryMethod = new BuiltinLibraryMethodContext(methodNameTranslation, description)
        this.methods[originalMethodName] = newLibraryMethod
        return newLibraryMethod
    }

    /** 
     * Adds a new struct to the module that the module supports and returns. For example, HTTP can return a Response
     * struct, we then can use it translated.
     * 
     * @param {string} originalStructName - The original name of the struct.
     * @param {string} structNameTranslation - The translated name of the struct.
     * 
     * @returns {BuiltinLibraryStructContext} - Returns a new BuiltinLibraryStructContext instance so you can use
     * to add the attributes of the struct.
     */
    addStruct(originalStructName, structNameTranslation) {
        const newLibraryStruct = new BuiltinLibraryStructContext(structNameTranslation)
        this.structs[originalStructName] = newLibraryStruct
        return newLibraryStruct
    }

    /** 
     * If the module can create structs, then you use this method to translate the parameters to create the struct.
     * like 
     * ```
     * module ExampleModule(name, age) do end
     * ```
     * We can translate `name` and `age` as we want and need.
     * 
     * @param {string} originalStructParameterName - The original name of the struct parameter
     * @param {string} structParameterNameTranslation - The translated name of the struct parameter
     */
    addStructParameter(originalStructParameterName, structParameterNameTranslation) {
        this.structParameters[originalStructParameterName] = structParameterNameTranslation
    }
}

/**
 * This might not be clear for everyone but this context is used for defining the datetime context.
 * Inside of flow, flow is not timezone agnostic it's aware and not naive. So we append the timezone of
 * the user inside here. We also append the Date character so instead of defining a date like
 * ~D[2010-01-01] we can define it like ~T[2010-01-01] in a way that makes more sense in other parts of the word
 * because of the translation.
 * Last but not least we define the dateFormat and timeFormat following moment.js type of formatting.
 */
class DatetimeContext {
    /**
     * @param {object} datetimeKeywordOptions - The options for defining date and time inside of reflow
     * @param {string} datetimeKeywordOptions.timezone - Usually GMT, but can be any timezone supported by
     * modern browsers.
     * @param {string} datetimeKeywordOptions.dateCharacter - The character for defining a date inside of flow.
     * @param {string} datetimeKeywordOptions.dateFormat - The format of the date following moment.js formatting.
     * Usually YYYY-MM-DD.
     * @param {string} datetimeKeywordOptions.timeFormat - The format of the time following moment.js formatting.
     * Usually HH:mm:ss.SSS
     */
    constructor({ timezone, dateCharacter, dateFormat, timeFormat } = {}) {
        this.timezone = timezone
        this.dateCharacter = dateCharacter
        this.dateFormat = dateFormat
        this.timeFormat = timeFormat
    }
}

/**
 * The context for translating the if keywords like `if` and `else`. Most programming languages
 * have these logic gate keywords.
 */
class IfContext {
    /**
     * @param {object} ifKeywordOptions - The keywords for defining logic gates.
     * @param {string} ifKeywordOptions.ifKeyword - The keyword for defining if statements. Usually `if`.
     * @param {string} ifKeywordOptions.elseKeyword - The keyword for defining else statements. Usually `else`.
     */
    constructor({ ifKeyword, elseKeyword } = {}) {
        this.ifKeyword = ifKeyword
        this.elseKeyword = elseKeyword
    }
}

/**
 * The context for translating the try, catch and throws keywords. Most programming languages
 * have these error gate keywords. Flow is no exception.
 */
class ErrorContext {
    /**
     * @param {object} ifKeywordOptions - The keywords for defining try and catch gates. And also for raising errors
     * @param {string} ifKeywordOptions.tryKeyword - The keyword for defining try statements. Usually `try`.
     * @param {string} ifKeywordOptions.catchKeyword - The keyword for defining catch statements. Usually `otherwise`.
     * @param {string} ifKeywordOptions.raiseKeyword - The keyword for defining raise statements. Usually `raise`.
     */
    constructor({ raiseKeyword, tryKeyword, catchKeyword } = {}) {
        this.tryKeyword = tryKeyword
        this.catchKeyword = catchKeyword
        this.raiseKeyword = raiseKeyword
    }
}

/**
 * Context for translating the boolean keywords like `true` and `false`.
 */
class BooleanContext {
    /**
     * @param {object} booleanKeywordOptions - The keywords for defining the boolean values.
     * @param {string} booleanKeywordOptions.trueKeyword - The keyword for the `true` value. Usually `true`.
     * @param {string} booleanKeywordOptions.falseKeyword - The keyword for the `false` value. Usually `false`.
     */
    constructor({ trueKeyword, falseKeyword } = {}) {
        this.trueKeyword = trueKeyword
        this.falseKeyword = falseKeyword
    }
}

/**
 * Context for translating the block, a block is defined by the `do` and `end` keywords. In languages like python 
 * this doesn't exist. In languages like javascript, the block is defined by the `{` and `}` characters. And in languages
 * like ruby or even lua this is defined as `do` and `end`.
 */
class BlockContext {
    /**
     * @param {object} blockKeywordOptions - The keywords for defining a block inside of reflow.
     * @param {string} blockKeywordOptions.doKeyword - The keyword for defining the start of a block. Usually `do`.
     * @param {string} blockKeywordOptions.endKeyword - The keyword for defining the end of a block. Usually `end`.
     */
    constructor({ doKeyword, endKeyword } = {}) {
        this.doKeyword = doKeyword
        this.endKeyword = endKeyword
    }
}

/**
 * All of the keywords that can be translated inside of flow. We can translate keywords like `function` to `função`
 * or `if` to `se` or `else` to `senão` and even `True` to `Verdadeiro` or `None` to `Nulo`. This make it really easy
 * to export to different languages.
 */
class KeywordsContext {
    /**
     * @param {object} keywordOptions - All of the possible keywords we can have inside of flow.
     * @param {string} keywordOptions.includesKeyword - The keyword that represents the `in` statement.
     * @param {string} keywordOptions.inversionKeyword - The keyword that represents the `not` or `!` statement.
     * @param {string} keywordOptions.disjunctionKeyword - The keyword that represents the `or` or `||` statement.
     * @param {string} keywordOptions.conjunctionKeyword - The keyword that represents the `and` or `&& statement.
     * @param {string} keywordOptions.equalityKeyword - The keyword that represents the `is` or `==` statement.
     * @param {string} keywordOptions.inequalityKeyword - The keyword that represents the `is not` or `!=` statement.
     * @param {string} keywordOptions.functionKeyword - The keyword that represents the `function` or `def` statement.
     * @param {string} keywordOptions.returnKeyword - The keyword that represents the `return` statement. It's presented as `return` in both
     * python and javascript.
     * @param {string} keywordOptions.moduleKeyword - The keyword that represents the `module` statement. Will make more sense
     * if you know elixir, at least the basic of it.
     * @param {string} keywordOptions.documentationKeyword - The keyword that provides a new documentation string for the next
     * statement block. By doing this we can easily be able to add documentation to each object inside of flow.
     * @param {string} keywordOptions.nullKeyword - The keyword that represents the `null` or `None` statement.
     * @param {BlockContext} keywordOptions.blockContext - The Block context instance with the block keywords.
     * @param {BooleanContext} keywordOptions.booleanContext - The Boolean context instance with the boolean keywords.
     * @param {IfContext} keywordOptions.ifContext - The If context instance with the if and else keywords.
     * @param {ErrorContext} keywordOptions.errorContext - The Error context instance with the try, catch and raise keywords.
     `*/
    constructor({ includesKeyword, inversionKeyword, disjunctionKeyword, conjunctionKeyword, equalityKeyword,
                  inequalityKeyword, functionKeyword, returnKeyword, moduleKeyword, documentationKeyword, nullKeyword, 
                  blockContext, booleanContext, ifContext, errorContext } = {}) {

        this.includesKeyword = includesKeyword
        this.inversionKeyword = inversionKeyword
        this.disjunctionKeyword = disjunctionKeyword
        this.conjunctionKeyword = conjunctionKeyword
        this.equalityKeyword = equalityKeyword
        this.inequalityKeyword = inequalityKeyword
        this.functionKeyword = functionKeyword
        this.returnKeyword = returnKeyword
        this.moduleKeyword = moduleKeyword
        this.documentationKeyword = documentationKeyword
        this.nullKeyword = nullKeyword
        this.blockContext = blockContext
        this.booleanContext = booleanContext
        this.ifContext = ifContext
        this.errorContext = errorContext
    }
}

/**
 * Data needed for when flow is running inside of a formula field in a formulary.
 */
class ReflowFormulaContext {
    /**
     * @param {object} reflowContextData - The data that will be added to the runtime while the code is running so we can
     * retrieve any time we want. 
     * @param {number|null} [reflowContextData.dynamicFormId=null] - If the user is running flow in a formula field, when the user
     * is saving we want to have access for the formulary record id of the formulary that was created/updated.
     */
    constructor({ dynamicFormId=null } = {}) {
        this.dynamicFormId = dynamicFormId
    }
}

/**
 * Context for reflow specific for when flow is running inside of an automation.
 */
class ReflowAutomationContext {
    /** 
     * @param {object} reflowContextData - The data that will be added to the runtime while the code is running so we can
     * retrieve any time we want. 
     * @param {number|null} [reflowContextData.automationId=null] - This is when the user is running flow inside of an automation,
     * when running inside of a formula this can be null.
     * @param {object|null} [reflowContextData.triggerData=null] - The data from the trigger we recover it so user can 
     * access it inside of the flow code if he wants.
     * @param {object|null} [reflowContextData.actionData=null] - Same as the `automationTriggerData` except that this 
     * can be recovered when running flow inside of an action from the automation and not a trigger.
     * @param {boolean} [reflowContextData.debugTrigger=false] - Debugs a trigger data so we can know what data
     * will be available from the action. 
     */
    constructor({ automationId=null, triggerData=null, actionData=null, debugTrigger=false} = {}) {
        this.id = automationId
        this.triggerData = triggerData
        this.actionData = actionData
        this.debugTrigger = debugTrigger
    }
}

/**
 * The conext specific for reflow. This is something more of a Business Logic but we added this here.
 * This is able to hold specific information inside of the runtime without ever making it available to the user.
 */
class ReflowContext {
    /**
     *  @param {object} reflowContextData - The data that will be added to the runtime while the code is running so we can
     * retrieve any time we want. By default we set everything to null because we think that although it is something from reflow
     * it don't need to be always bound to reflow itself.
     * @param {number} [reflowContextData.companyId=null] - The companyId of the company that is running flow.
     * @param {number} [reflowContextData.userId=null] - The userId of the user that is running flow.
     * @param {number|null} [reflowContextData.dynamicFormId=null] - If the user is running flow in a formula field, when the user
     * is saving we want to have access for the formulary record id of the formulary that was created/updated.
     * @param {number|null} [reflowContextData.automationId=null] - This is when the user is running flow inside of an automation,
     * when running inside of a formula this can be null.
     * @param {object|null} [reflowContextData.automationTriggerData=null] - The data from the trigger we recover it so user can 
     * access it inside of the flow code if he wants.
     * @param {object|null} [reflowContextData.automationActionData=null] - Same as the `automationTriggerData` except that this 
     * can be recovered when running flow inside of an action from the automation and not a trigger.
     * @param {boolean} [reflowContextData.automationDebugTrigger=false] - Debugs a trigger data so we can know what data
     * will be available from the action.
     */
    constructor({companyId=null, userId=null, dynamicFormId=null, automationId=null, automationTriggerData=null, 
                 automationActionData=null, debugTrigger=false} = {}) {
        this.companyId = companyId
        this.userId = userId
        this.automation = new ReflowAutomationContext({
            automationId, 
            triggerData: automationTriggerData, 
            actionData: automationActionData, 
            debugTrigger
        })
        this.formula = new ReflowFormulaContext({
            dynamicFormId
        })
    }
}

/**
 * Responsible for creating the context for the formula evaluation, with this we can translate the formulas to other
 * languages, which is something impossible in languages like python, javascript and many others.
 */
class Context {
    /**
     * @param {object} contextKeywordsAndSymbols - The keywords and symbols that are used in the formula and that can be translated.
     * @param {string} [contextKeywordsAndSymbols.includes='in'] - The includes, in python it is known as "in", "in" 
     * in python is a generator for iterators, in our case it's just for boolean. Defaults to 'in'.
     * @param {string} [contextKeywordsAndSymbols.conjunction='and'] - The conjunction, also known as "&&" in other languages like JS 
     * or "and" in python. Defaults to 'and'.
     * @param {string} [contextKeywordsAndSymbols.disjunction='or'] - The disjunction, also known as "||" in other languages like JS 
     * or "or" in python. Defaults to 'or'.
     * @param {string} [contextKeywordsAndSymbols.inversion='not'] - The inversion, also known as '!' in other languages like JS 
     * or "not" in python. Defaults to 'not'.
     * @param {string} [contextKeywordsAndSymbols.equality='is'] - The equality, also known as "==" in other languages like JS.
     * Besides the `==` operator we will also be able to use `is` to check if the value is equal to another value, making the code more
     * readable. Defaults to 'is'.
     * @param {string} [keywordOptions.inequality='is not'] - The keyword that represents the `is not` or `!=` statement. Defaults to 'is not'.
     * @param {string} [contextKeywordsAndSymbols.blockDo='do'] - The start of the block, on some languages like JS this is considered 
     * as '{' and in ruby or elixir 'do'. Defaults to 'do'.
     * @param {string} [contextKeywordsAndSymbols.blockEnd='end'] - The end of the block, on some languages like JS this is considered 
     * as '}' and in ruby or elixir 'end'. Defaults to 'end'.
     * @param {string} [contextKeywordsAndSymbols.nullValue='None'] - The null keyword, on some languages like JS this is considered 
     * as 'null' and in ruby or elixir 'nil'. Defaults to 'None'. 
     * @param {string} [contextKeywordsAndSymbols.booleanTrue='True'] - The boolean True keyword. In python it is "True", 
     * on other languages like JS it can be "true". Defaults to 'True'
     * @param {string} [contextKeywordsAndSymbols.booleanFalse='False'] - The boolean False keyword. In python it is "False", 
     * on other languages like JS it can be "false". Defaults to 'False'
     * @param {string} [contextKeywordsAndSymbols.ifIf='if'] - The if keyword to start a logic gate, mostly known as "if". 
     * Defaults to 'if'.
     * @param {string} [contextKeywordsAndSymbols.ifElse='else'] - The else keyword when the conditional logic gate is not satisfied, 
     * mostly known as "else". Defaults to 'else'.
     * @param {string} [contextKeywordsAndSymbols.functionKeyword='function'] - The function keyword to create a new function. 
     * On python it is like "def", on JS it is "function". Defaults to 'function'.
     * @param {string} [contextKeywordsAndSymbols.returnKeyword='return'] - The return keyword to return a statement or value inside of a function or the program.
     * This will enable users to create programs that have early return, this will make the language itself less intimidating for programmers since we don't support
     * a powerful pattern matching. Defaults to 'return'.
     * @param {string} [contextKeywordsAndSymbols.moduleKeyword='module'] - The module keyword to create a new module. This is similar to a python
     * class, EXCEPT, all methods and attributes are static. This is more like a Elixir module. Defaults to 'module'.
     * @param {string} [contextKeywordsAndSymbols.documentationKeyword='@doc'] - This keyword will be used to document the next statement inside of Flow.
     * This will be able to provide a custom documentation of the object to the user so he can document his code. Just add ```@doc``` and then we will append 
     * to the documentation of the next object the string that will be inside of /* * /.
     * @param {string} [contextKeywordsAndSymbols.raiseKeyword='raise'] - The raise keyword to throw an error inside of flow. On python it is 'raise'
     * and on javascript it is 'throw'. Defaults to 'raise'.
     * @param {string} [contextKeywordsAndSymbols.tryKeyword='try'] - The try keyword to try a block of code inside of flow and if it gives an error run the catch block. 
     * On python it is 'try' and on javascript it is 'try'. Defaults to 'try'.
     * @param {string} [contextKeywordsAndSymbols.catchKeword='otherwise'] - The catch keyword to run if the code throws an error inside of the try block. On python it is 'except'
     * and on javascript it is 'catch'. Defaults to 'otherwise'.
     * @param {string} [contextKeywordsAndSymbols.decimalPointSeparator='.'] - The decimal point separator, usually on most 
     * languages it is represented as '.', but we can translate to ',' if needed. Defaults to '.'.
     * @param {string} [contextKeywordsAndSymbols.positionalArgumentSeparator=','] - The positional arguments separator, on most 
     * languages it is represented as ',', but on others like excel this can be ';'. Defaults to ','.
     * @param {string} [contextKeywordsAndSymbols.timezone='GMT'] - The timezone of the flow context, flow is timezone aware EVERYTIME, 
     * we know where the code is running so we use this. The timezone is based on pytz database, so use this. Defaults to 'GMT'.
     * @param {string} [contextKeywordsAndSymbols.dateCharacter='D'] - The charcter to create a new date, did you know that you write 
     * 'date' in russia like 'Дата'? this means that in russia instead of creating a date like ~D[2018-03-01] he should be able to create
     * like: ~Д[2018-03-01], this way it's easier to understand the concept in all languages. Defaults to 'D' as in date
     * @param {string} [contextKeywordsAndSymbols.dateFormat='YYYY-MM-DD'] - The format of the date, we are trying to support the hole format
     * available in moment.js, but at this time we only support YYYY, MM and DD. You can rearange them the way you want. Defaults to 'YYYY-MM-DD'.
     * @param {string} [contextKeywordsAndSymbols.hourFormat='hh:mm:ss.SSS'] -  The format of the date, similar to the above, we want to try 
     * to support all of the formats of moment.js but at the time we only support HH:mm:ss and SSS. HH is for 24 hour date format, hh for 12-hour 
     * date format, mm for minutes, ss for seconds and SSS for microsecond, AA is also supported for AM or PM. Defaults to 'hh:mm:ss.SSS'
     * @param {string} [contextKeywordsAndSymbols.languageContext='pt-BR'] - The language context of flow. This means everything will need to be translated
     * to this specific language. The language here refers to SPOKEN languages and NOT PROGRAMMING language. So, portuguese, english, spanish and so on.
     * @param {string} [contextKeywordsAndSymbols.attributesLabel='attributes'] - The label of the `attributes` in the string representation of a module.
     * @param {string} [contextKeywordsAndSymbols.tailCallOptimizedMessage='tail call optimized'] - The message that will show to the user when printing 
     * the function stringfied that the function is tail call optimized. Defaults to 'tail call optimized'.
     */
    constructor({includes='in', conjunction='and', disjunction='or', inversion='not', equality='is', inequality='is not',
                blockDo='do', blockEnd='end', nullValue='None', booleanTrue='True', booleanFalse='False', ifIf='if', 
                ifElse='else', functionKeyword='function', returnKeyword='return', raiseKeyword='raise', 
                tryKeyword='try', catchKeyword='otherwise', moduleKeyword='module', decimalPointSeparator='.', 
                positionalArgumentSeparator=',', timezone='UTC', dateCharacter='D', dateFormat='YYYY-MM-DD', 
                hourFormat='hh:mm:ss.SSS', documentationKeyword='@doc', languageContext='pt-BR', attributesLabel='attributes',
                tailCallOptimizedMessage='tail call optimized'} = {}) {
        const blockContext = new BlockContext({ doKeyword: blockDo, endKeyword: blockEnd })
        const booleanContext = new BooleanContext({ trueKeyword: booleanTrue, falseKeyword: booleanFalse })
        const ifContext = new IfContext({ ifKeyword: ifIf, elseKeyword: ifElse })
        const errorContext = new ErrorContext({ 
            raiseKeyword: raiseKeyword, 
            tryKeyword: tryKeyword, 
            catchKeyword: catchKeyword 
        })
        
        this.tailCallOptimizedMessage = tailCallOptimizedMessage
        this.languageContext = languageContext
        this.attributesLabel = attributesLabel
        this.keyword = new KeywordsContext({
            includesKeyword: includes,
            inversionKeyword: inversion,
            disjunctionKeyword: disjunction,
            conjunctionKeyword: conjunction,
            equalityKeyword: equality,
            inequalityKeyword: inequality,
            functionKeyword: functionKeyword,
            returnKeyword: returnKeyword,
            moduleKeyword: moduleKeyword,
            documentationKeyword: documentationKeyword,
            nullKeyword: nullValue,
            blockContext: blockContext,
            booleanContext: booleanContext,
            errorContext: errorContext,
            ifContext: ifContext,
            raiseKeyword: raiseKeyword
        })
        this.positionalArgumentSeparator = positionalArgumentSeparator
        this.decimalPointSeparator = decimalPointSeparator
        this.datetime = new DatetimeContext({
            timezone,
            dateCharacter,
            dateFormat,
            timeFormat: hourFormat
        })
        this.library = {}
        this.reflow = new ReflowContext()
        this.specialModuleMethods = new SpecialModuleMethodsContext()
        this.modulesToRuntime = [
            {
                moduleClass: require('./builtins/library/http'),
                moduleName: 'HTTP'
            },
            {
                moduleClass: require('./builtins/library/documentation'),
                moduleName: 'Documentation'
            },
            {
                moduleClass: require('./builtins/library/list'),
                moduleName: 'List' 
            },
            {
                moduleClass: require('./builtins/library/dict'),
                moduleName: 'Dict'
            },
            {
                moduleClass: require('./builtins/library/boolean'),
                moduleName: 'Boolean'
            },
            {
                moduleClass: require('./builtins/library/string'),
                moduleName: 'String'
            },
            {
                moduleClass: require('./builtins/library/datetime'),
                moduleName: 'Datetime'
            },
            {
                moduleClass: require('./builtins/library/error'),
                moduleName: 'Error'
            },
            {
                moduleClass: require('./builtins/library/module'),
                moduleName: 'Module'
            },
            {
                moduleClass: require('./builtins/library/function'),
                moduleName: 'Function'
            },
            {
                moduleClass: require('./builtins/library/float'),
                moduleName: 'Float'
            },
            {
                moduleClass: require('./builtins/library/integer'),
                moduleName: 'Integer'
            },
            {
                moduleClass: require('./builtins/library/struct'),
                moduleName: 'Struct'
            },
            {
                moduleClass: require('./builtins/library/number'),
                moduleName: 'Number'
            },
        ]
    }

    /**
     * Adds a new library module to the context. A library module is just a module for the Flow context. Modules
     * are like builtin functions that does something in Flow, like math, datetime, string, http, and so on.
     * This returns a new BultinLibraryModuleContext instance, you should check the class for the other functions
     * to work with Library modules.
     * 
     * @param {string} originalModuleName - The original name of the module, like Math, Datetime, String, HTTP and so on
     * this is the name that we effectively recognize for a module.
     * @param {string} moduleNameTranslation - The translation for the module name. Math will be Matemática. Datetime will
     * be Dataehora. String will be Texto and so on.
     * @param {string} [description=''] - The description of the module. What does is do.
     * 
     * @returns {BultinLibraryModuleContext} - A new instance of BultinLibraryModuleContext. You will use this to add
     * structs, attributes, parameters, methods and so on translate everything from the library module.
     */
    addLibraryModule(originalModuleName, moduleNameTranslation, description='') {
        const newLibraryModule = new BultinLibraryModuleContext(moduleNameTranslation, description)
        this.library[originalModuleName] = newLibraryModule
        return newLibraryModule
    }

    /**
     * Specific for reflow actually, this function adds everything that is needed to the context for reflow.
     * We append to the runtime the companyId of the company that is running flow, the userId, the dynamicFormId,
     * stuff like automation and so on. This is what makes creating a programming language for reflow so powerful.
     * We can append anything we want directly at runtime and we can abstract it away from the user so the user
     * will not be able to retrieve any of those information if we don't want them to.
     * 
     * @param {object} reflowContextData - The data that will be added to the runtime while the code is running so we can
     * retrieve any time we want.
     * @param {number} reflowContextData.companyId - The companyId of the company that is running flow.
     * @param {number} reflowContextData.userId - The userId of the user that is running flow.
     * @param {number|null} [reflowContextData.dynamicFormId=null] - If the user is running flow in a formula field, when the user
     * is saving we want to have access for the formulary record id of the formulary that was created/updated.
     * @param {number|null} [reflowContextData.automationId=null] - This is when the user is running flow inside of an automation,
     * when running inside of a formula this can be null.
     * @param {object|null} [reflowContextData.automationTriggerData=null] - The data from the trigger we recover it so user can 
     * access it inside of the flow code if he wants.
     * @param {object|null} [reflowContextData.automationActionData=null] - Same as the `automationTriggerData` except that this 
     * can be recovered when running flow inside of an action from the automation and not a trigger.
     * @param {boolean} [reflowContextData.automationDebugTrigger=false] - Debugs a trigger data so we can know what data
     * will be available from the action.
     */
    addReflowData({ companyId, userId, dynamicFormId=null, automationId=null, automationTriggerData=null, 
                    automationActionData=null, automationDebugTrigger=false } = {}) {
        this.reflow = new ReflowContext({
            companyId,
            userId,
            dynamicFormId,
            automationId,
            automationTriggerData,
            automationActionData,
            debugTrigger: automationDebugTrigger
        })
    }

    /**
     * This will add modules to the runtime so users can use them inside of Flow.
     * For example: 
     * 
     * HTTP.get("https://www.google.com")
     * 
     * HTTP will be a module already available in runtime when flow runs.
     * 
     * @param {class} module - The module to add to the runtime.
     */
    addModulesToRuntime(moduleClass, moduleName) {
        this.modulesToRuntime.push({
            moduleClass: moduleClass,
            moduleName: moduleName
        })
    }

    addSpecialModuleMethods({ _initialize_='__initialize__', _getattribute_='__getattribute__', _setattribute_='__setattribute__', 
                              _getitem_='__getitem__', _setitem_='__setitem__', _add_='__add__', _subtract_='__subtract__',
                              _divide_='__divide__', _remainder_= '__remainder__', _multiply_='__multiply__', _power_='__power__',
                              _in_='__in__', _equals_='__equals__', _difference_='__difference__', _lessthan_='__lessthan__', _lessthanequal_='__lessthanequal__',
                              _greaterthan_='__greaterthan__', _greaterthanequal_='__greaterthanequal__', _boolean_='__boolean__', _not_='__not__', 
                              _and_='__and__', _or_='__or__', _unaryplus_='__unaryplus__', _unaryminus_='__unaryminus__',
                              _string_='__string__', _json_='__json__', _hash_='__hash__', _length_='__length__', _call_='__call__'} = {}) {
        this.specialModuleMethods = new SpecialModuleMethodsContext({
            _initialize_, _getattribute_, _setattribute_, _getitem_, _setitem_, _add_, _subtract_, _divide_, _remainder_, _multiply_, _power_,
            _in_, _equals_, _difference_, _lessthan_, _lessthanequal_, _greaterthan_, _greaterthanequal_, _boolean_, _not_, _and_, _or_,
            _unaryplus_, _unaryminus_, _string_, _json_, _hash_, _length_, _call_
        })            
    }

    /**
     * Adds a new module to the standard library of the language inside the following runtime.
     * 
     * @param {import('./builtins/library').LibraryModule} module - The module to add to the standard library.
     * @param {string} moduleName - The name of the module to add to the standard library.
     */
    addModuleToRuntime(moduleClass, moduleName) {
        this.modulesToRuntime.push({
            moduleClass: moduleClass,
            moduleName: moduleName
        })
    }
}

module.exports = Context