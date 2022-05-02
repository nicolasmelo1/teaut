const { strings } = require('../constants')
const Context = require('./context')
const evaluate = require('./evaluate')

/**
 * The ContextService class is one of the main classes for flow formulas. That's because it's here that we will kinda enable all of the translations.
 * See that we do not access `strings` constant directly in the flow code, (except in `documentation` method in the builtin modules). Instead, all of the
 * translation of the formulas are enabled and made available through the `Context` class.
 * 
 * So what we do here is setup this class with the translation of the formula. With this the user can write a valid flow formula in he's own spoken language
 */
class ContextService {
    async appendTranslation() {
        const documentationTitle = strings('flowDocumentationDocumentationHeaderLabel', this.context.languageContex)
        const documentationExamplesTitle = strings('flowDocumentationExamplesHeaderLabel', this.context.languageContex)

        const appendParameters = (parameterName, details, builtinLibraryMethod) => {
            const translatedParameterName = details.name || parameterName
            const parameterDescription = details.description || ''
            const parameterType = details.type || 'any'
            const parameterRequired = details.required !== undefined ? details.required : true
            builtinLibraryMethod.addParameter(parameterName, translatedParameterName, parameterDescription)
        }

        const appendMethods = (methodName, details, builtinLibraryModule) => {
            const translatedMethodName = details.name || methodName
            const methodExamples = details.examples || ''
            let methodDescription = `# ${documentationTitle}\n\n${details.description || ''}`
            if (methodExamples.length > 0) methodDescription += `\n\n\n# ${documentationExamplesTitle}\n\n${methodExamples}`  

            const hasParameters = ![null, undefined, ''].includes(details.parameters) && typeof details.parameters === 'object'
            const builtinLibraryMethod = builtinLibraryModule.addMethod(
                methodName, translatedMethodName, methodDescription
            )
            if (hasParameters === true) {
                for (const [parameterName, parameterDetails] of Object.entries(details.parameters)) {
                    appendParameters(parameterName, parameterDetails, builtinLibraryMethod)
                }
            }
        }

        const appendStructs = (structName, details, builtinLibraryModule) => {
            const translatedStructName = details.name || structName
            const structDescription = details.description || ''
            const hasAttributes = ![null, undefined, ''].includes(details.attributes) && typeof details.attributes === 'object'
            const builtinLibraryStruct = builtinLibraryModule.addStruct(
                structName, translatedStructName, structDescription
            )
        }

        const appendModules = (moduleName, details) =>{
            const translatedModuleName = details.name || moduleName
            const moduleDescription = `# ${documentationTitle}\n\n${details.description || ''}`
            const isMethodsDefined = !['', null, undefined].includes(details.methods) && typeof details.methods === 'object'
            const isStructsDefined = !['', null, undefined].includes(details.structs) && typeof details.structs === 'object'
            const builtinLibraryModule = this.context.addLibraryModule(moduleName, translatedModuleName, moduleDescription)

            if (isMethodsDefined === true) {
                for (const [methodName, methodDetails] of Object.entries(details.methods)) {
                    appendMethods(methodName, methodDetails, builtinLibraryModule)
                }
            }

            if (isStructsDefined === true) {
                for (const [structName, structDetails] of Object.entries(details.structs)) {
                    appendStructs(structName, structDetails, builtinLibraryModule)
                }
            }
        }

        const promises = this.context.modulesToRuntime.map(async ({ moduleClass, moduleName }) => {
            const documentation = await moduleClass.documentation(this.context.languageContext)
            const doesDocumentationExists = ![null, undefined].includes(documentation) && typeof documentation === 'object'
            if (doesDocumentationExists === true) {
                appendModules(moduleName, documentation)
            }
        })
        await Promise.all(promises)
    }

    /**
     * This is responsible for appending the extra modules to the runtime. So what we need to do is that for different context where
     * flow is running, we can append new builtin modules. So for example:
     * 
     * When we are building the Automation app, and want to use flow to run the automations. What we do is that we can append the Automation
     * module to the running context, so then Automation module will be available to use for the users/programmers.
     * 
     * Inside of the management app for example, we might want to retrieve the values of some particular fields. For that we can create
     * a `Formula` module where we can have specific methods and attributes.
     * 
     * @param {Array<{moduleClass: import('./builtins/library').LibraryModule, moduleName: string}>} extraModules - An array containing
     * all of the extra modules that you want to append to the runtime.
     */
    async appendExtraModulesAndTranslate(extraModules) {
        for (const extraModule of extraModules) {
            const { moduleName, moduleClass } = extraModule
            
            if (['', null, undefined].includes(moduleName)) throw new Error('moduleName is required in `extraModules`')

            const isModuleClassDefined = !['', null, undefined].includes(moduleClass)
            if (isModuleClassDefined === true) this.context.addModuleToRuntime(moduleClass, moduleName)
        }
        await this.appendTranslation()
    }

    async buildContext(languageContext, extraModules) {
        this.context = new Context({
            includes: strings('flowIncludesKeyword', languageContext),
            conjunction: strings('flowConjunctionKeyword', languageContext),
            disjunction: strings('flowDisjunctionKeyword', languageContext),
            inversion: strings('flowInversionKeyword', languageContext),
            equality: strings('flowEqualityKeyword', languageContext),
            inequality: strings('flowInequalityKeyword', languageContext),
            blockDo: strings('flowDoKeyword', languageContext),
            blockEnd: strings('flowEndKeyword', languageContext),
            ifIf: strings('flowIfKeyword', languageContext),
            ifElse: strings('flowElseKeyword', languageContext),
            nullValue: strings('flowNullKeyword', languageContext),
            booleanTrue: strings('flowTrueKeyword', languageContext),
            booleanFalse: strings('flowFalseKeyword', languageContext),
            functionKeyword: strings('flowFunctionKeyword', languageContext),
            returnKeyword: strings('flowReturnKeyword', languageContext),
            raiseKeyword: strings('flowRaiseKeyword', languageContext),
            tryKeyword: strings('flowTryKeyword', languageContext),
            catchKeyword: strings('flowCatchKeyword', languageContext),
            moduleKeyword: strings('flowModuleKeyword', languageContext),
            decimalPointSeparator: strings('flowDecimalPointSeparator', languageContext),
            positionalArgumentSeparator: strings('flowPositionalArgumentSeparator', languageContext),
            timezone: strings('flowTimezone', languageContext),
            dateCharacter: strings('flowDateCharacter', languageContext),
            dateFormat: strings('flowDateFormat', languageContext),
            hourFormat: strings('flowHourFormat', languageContext),
            documentationKeyword: strings('flowDocumentationKeyword', languageContext),
            languageContext: languageContext,
            attributesLabel: strings('flowAttributesLabel', languageContext),
            tailCallOptimizedMessage: strings('flowTailCallOptimizedMessage', languageContext),
        })

        await this.appendExtraModulesAndTranslate(extraModules)
        return this.context
    }
}

/**
 * Responsible for making the formula interact with the "outside world". As said before, flow doesn't know almost anything about reflow software.
 * It is almost 100% independent from reflow itself so you can, with a few changes, pretty much copy the code from reflow and use it in another
 * software.
 * 
 * By making this we make flow less prone to subtle bugs and errors. It is a lot less painful to test since we don't need any database or special
 * stuff to test the formula. We pretty much just need to run flow and see if the result is as expected.
 * 
 * So with that, this will be used to interact directly with the outside world. So this service can hold any business logic that is needed
 * in order to evaluate a function. We can work with different contexts, variable translation, and all of that stuff.
 */
class FlowService {

    /**
     * @param {import('./context')} context - The context of the formula, in other words, on what spoken language the hole formula is written?
     */
    constructor(context) {
        this.context = context
    }
    
    /**
     * You should NEVER construct this class directly. Instead you should use this static factory method to create new `FlowService` instances.
     * That's because on the creation of the `FlowService` instance, we need to build the context of the formula and that has a lot of async
     * code.
     * 
     * @param {string} [languageContext='pt-BR'] - The spoken language to use when building the context of the formula. By default it will be
     * in portuguese.
     * @param {Array<{moduleClass: import('./builtins/library').LibraryModule, moduleName: string}>} [extraModules=[]] - An array containing
     * all of the extra modules that you want to append to the runtime. So this library will be available when you run the formula. This means
     * that you can create modules that are not part of the default `flow` library.
     * 
     * @returns {Promise<FlowService>} - Return the created `FlowService` instance.
     */
    static async initialize(languageContext='pt-BR', extraModules=[]) {
        const contextService = new ContextService()
        const context = await contextService.buildContext(languageContext, extraModules)
        return new this(context, languageContext)
    }

    /**
     * Evaluate a formula code and return the result.
     * 
     * @param {string} code - The actual flow code to evaluate.
     * @param {object} options - The options to use when evaluating the formula.
     * @param {boolean} [options.isToReturnRepresentation=false] - If this is `true`, then the result will be returned as a javascript value.
     * Otherwise it will be a `FlowObject` instance.
     * 
     * @returns {Promise<import('./builtins/objects/object') | any>} - The result of the expression will ALWAYS be a FlowObject when `options.isToReturnRepresentation` is `false`.
     * Otherwise can return any type of javascript value.
     */
    async evaluate(code, {isToReturnRepresentation=false}={}) {
        const result = await evaluate(code, this.context, true)
        if (isToReturnRepresentation === true) {
            return await result._representation_()
        } else {
            return result
        }
    }
}

module.exports = FlowService