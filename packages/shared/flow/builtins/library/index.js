const { libraryHelpers, camelCaseToSnakeCase, snakeCaseToCamelCase } = require('../../helpers')
const FlowModule = require('../objects/module')
const FlowFunction = require('../objects/function')
const { FlowObject, FlowNull, FlowStruct } = require('../objects')

/**
 * An extended and different Function object, the idea is super simple: 
 * the only difference from this and the original FlowFunction class is that
 * this one also recieves the `callback` parameter, as well the `parametersContext`. 
 * - The first one is the actual function that is called when we call the `_call_()`
 * method. This means that these functions will by default not be tail call optimized for obvioud reasons,
 * they always need to return something.
 * - The second parameter: `parametersContext` is used for translating in real time the arguments that
 * the function recieves and passing it to the original callback function.
 */
class LibraryFunction extends FlowFunction {
    /**
     * @param {import('../../settings').Settings} settings - The settings object.
     * @param {function} callback - The actual function that is called when we call the `_call_()`
     * method. This means that these functions will by default not be tail call optimized for obvioud reasons,
     * they always need to return something.
     * @param {object} parametersContext - The context of the parameters for this function, so we can translate
     * the attributes it recieves and then also translate back the attributes to the original name. For example:
     * `endereço` will be translated to `url` when we call the function if parameters context is ```{ url: 'endereço' }```
     */
    constructor(settings, callback, parametersContext) {
        super(settings)
        this.callback = callback
        let newParametersContext = {}
        Object.entries(parametersContext).forEach(([key, value]) => (newParametersContext[value] = key))
        this.parametersContext = newParametersContext
    }

    /**
     * We override the call implementation to call the callback instead of the bodyAST (The bodyAST will not exist in this
     * implementation). When we call the function we convert back the parameter name to the original names, this way we can
     * translate back the parameters to the original names. For example, "endereço" will be translated back to "url", and so on
     * The bad thing is that we need to translate the hole dict structure, which can add an overhead. 
     * But anyway, since this is a scripting language this is not much of a problem.
     * 
     * @param {import('../objects/dict')} parameters - The parameters recieved from the user to pass to the original function
     * implementation.
     * 
     * @returns {import('../objects/object') | any} - Returns a new FlowObject or return a javascript object, if returning a javascript
     * object we will automatically convert the value to a FlowObject.
     */
    async _call_(parameters) {
        let newParameters = {}

        for (const rawKeyInDict of parameters.hashTable.rawKeys.array) {
            if (rawKeyInDict !== undefined) {
                const key = await rawKeyInDict._representation_()
                const value = await parameters._getitem_(rawKeyInDict)
                // by default we convert the parameter which will be in snake case back to camelcase so we can get the original parameter
                // name
                if (this.parametersContext[key] !== undefined) {
                    newParameters[snakeCaseToCamelCase(this.parametersContext[key])] = value
                } else {
                    newParameters[snakeCaseToCamelCase(key)] = value
                }
            }
        }
        const result = await this.callback(newParameters)
        if (result instanceof FlowObject) {
            return result
        } else {
            const conversorHelper = new libraryHelpers.Conversor(this.settings)
            return await conversorHelper.javascriptValueToFlowObject(result)
        }
    }
}


/**
 * This is the core functionality of Flow so it's important that you understand how it works.
 * 
 * Flow is a programming language that is not supposed to be like a normal programming language, instead it's main goal
 * is to be a LOW-CODE programming language. What this mean? And how does it differ from a normal programming language? 
 * Are not all programming languages low-code?
 * 
 * Well, for some part yes, you can have bultin packages in normal programming languages that solves most of the tasks
 * you are trying to achieve. For example, in Javascript you can use directly `Date` to create a new Date, or
 * `Array` to create a new array. But what if you want to make a connection to GoogleSheets for example? For that you would
 * either need to use a CDN (if it's in the browser) or NPM(if it's node), so you would need to search for a package that 
 * makes this connection for you. Flow will offer it directly, like Array or Date in Javascript the user will just use
 * ```GoogleSheets.add_row()```
 * 
 * And just like that he will be able to add new rows on GoogleSheets. Also since flow is a programming language from Reflow
 * itself, it will be deeply integrated with reflow. And most data that the user might want to use will be injected inside of the
 * runtime.
 * 
 * You don't need to create it for everything though, just create the builtin modules as you/the users need them.
 * 
 * We recommend adding all modules and functions in Javascript directly since this will not be obscure for most other programmers 
 * to make changes and add new features (although Flow is more than capable of by default creating most modules). 
 * 
 * >>Important<<
 * All your module functions should be defined in `methods` attribute inside of the class
 * 
 * For example:
 * ```
 * class HTTP extends LibraryModule {
 *      libraryStructPatameters = {
 *          a: undefined,
 *          b: 'defaultValue'         
 *      }
 * 
 *      methods = {
 *           get: async ({url} = {}) => {
 *               return await this.newString("Hello from custom module")
 *           }
 *       }
 *
 *      static async documentation() {
 *          return {
 *              name: 'HTTP',
 *              description: 'HTTP library'
 *          }
 *      }
 * }
 * ```
 * 
 * Now we can use it inside of flow:
 * ```
 * HTTP.get(url="http://google.com") == "Hello from custom module"
 * ```
 * 
 * Also we can use it to create structs since we've defined the `libraryStructPatameters`
 * We will be able to create it like
 * ```
 * struct_from_module = HTTP{a=1}
 * 
 * struct_from_module == HTTP{a=1, b="defaultValue"}
 * ```
 * ^ Be aware that `a` will be obligatory since it's set to undefined and `b` will have the default value of "defaultValue"
 * 
 * Now let's point out how we do this:
 * - First you need to define the `documentation()` method inside of the attribute that will return a object. So we can
 * display the documentation of the module/functions to the user. Also by doing that we will be able to provide translations
 * so we can translate the module and functions for different languages.
 * - Second you will see that we use `this.newString`. If you've had read the objects specification you will see that
 * this function exists inside of the `FlowObject` class. This is because that we bind the function to the current instance,
 * so inside your function `this` will represent the FlowModule instance that is also a FlowObject, so `settings`, type and all
 * of the functions available in FlowModule will be also available inside of your function.
 * - Third: you need to define the functions as async and with arrow functions, because if you don't do that, `esprima` will not
 * be able to parse the function. Don't know what is esprima? We explain in the last part:
 * - Last but not least, your function arguments WILL BE a destructured object. For example on the function:
 * ```
 * get: async ({url, params={}} = {}) => {}
 * ```
 * The `url` will be considered a obligatory parameter and `params` will be a optional parameter. You CAN'T have undefined
 * as the default value of a function or else it will be considered as obligatory, this means that if you want the parameter to be
 * undefined by default, you use `null` instead. For using this we use esprima, a javascript parser that enables us to parse the
 * function as a string and extract the arguments from the function, see `parseFunctionArguments()` function in `library` helpers
 * for reference.
 */
class LibraryModule extends FlowModule {
    libraryStructPatameters = undefined
    parametersContextForFunctions = {}
    methods = {}

    /**
     * @param {import('../../settings').Settings} settings - Generally speaking we need to pass the settings on the runtime.
     * @param {string} moduleName - The translated module name.
     * @param {import('../../memory/record')} - The scope of the program that is running, so we can access the variables.
     */
    constructor(settings, moduleName, scope) {
        super(settings)
        this.isModuleInitialized = false
        this.moduleName = moduleName
        this.scope = scope
    }

    /**
     * By lazy initialization of the module we can speed up Flow initialization, not much, it's a couple of microseconds but this will make
     * it faster. By doing this, whatever we need to retrieve from the module we will check first if it's initialized or not, if it's not then
     * we first initialize and then we will do the operation that we need to do.
     * 
     * @param {string} methodName - Then name of the method we want to call, can be one of the special dunder methods, check `../objects/objects.js`, this
     * all the functions in the `FlowObject` class are the possible methods we can set here.
     * Although you don't need to override it all, just override the ones in '../objects/module.js' in the FlowModule class.
     */
    async #lazyInitializeTheModule(methodName, ...args) {
        if (this.isModuleInitialized === false) {
            await this._initialize_(this.moduleName, this.scope)
        }
        return await super[methodName](...args)
    }

    /**
     * This will translate the struct parameters of the library module, struct parameters are the parameters of the module
     * that will be used to create structs. In other words, if the `libraryStructParameters` is defined than
     * the module can create structs.
     * 
     * @returns {Promise<FlowDict | FlowNull>} - We return either a valid FlowDict so we can create modules or FlowNull so we cannot create
     * structs from the module.
     */
    async #translateStructParameters() {
        if (this.libraryStructPatameters) {
            const originalStructParameters = Object.entries(this.libraryStructPatameters)
            let translatedStructParameters = {}
            const hasStructParametersDefinedInContext = this.moduleContext !== undefined && this.moduleContext?.structParameter !== undefined
            const structParametersContext = hasStructParametersDefinedInContext ? this.moduleContext?.structParameters : {}

            for (const [key, value] of originalStructParameters) {
                if (structParametersContext[key] === undefined) {
                    translatedStructParameters[key] = value
                } else {
                    translatedStructParameters[structParametersContext[key]] = value
                }
            }
            
            if (Object.keys(translatedStructParameters) > 0) {
                return await this.conversorHelper.javascriptValueToFlowObject(translatedStructParameters)
            }
        }
        return await this.newNull()
    }

    /**
     * This will define the methods, first we parse the function arguments, then we translate all of the function
     * arguments as well as the function name, then we bind the function with the current istance and last but not least
     * we initialize the LibraryFunction class and append the created function to the current module.
     * 
     * This is supposed to be called AFTER we called the super._initialize_ method.
     * 
     * @param {import('../../memory/record')} scope - The scope of the program that is running, so we can access the variables in this present scope.
     */
    async #translateMethods(scope) {
        const methods = Object.entries(this.methods)
        
        for (const [name, method] of methods) {
            const methodParameters = libraryHelpers.parseFunctionArguments(method)
            let { translatedFunctionName, translatedFunctionArguments } = libraryHelpers.translateFunctionArgumentsAndMethodName(
                methodParameters, name, this.moduleContext
            )
            translatedFunctionName = camelCaseToSnakeCase(translatedFunctionName)
            let newFunctionArguments = {}
            for (const [key, value] of Object.entries(translatedFunctionArguments)) {
                newFunctionArguments[camelCaseToSnakeCase(key)] = value
            }
            const areParametersContextDefined = this.moduleContext !== undefined && this.moduleContext?.methods?.[name]?.parameters !== undefined
            const parametersContext = areParametersContextDefined ? this.moduleContext.methods[name].parameters : {}
            this.parametersContextForFunctions[name] = Object.keys(newFunctionArguments)
            const moduleMethod = new LibraryFunction(this.settings, method, parametersContext)
            moduleMethod.callback = moduleMethod.callback.bind(moduleMethod)
            await moduleMethod._initialize_(
                translatedFunctionName, 
                scope, 
                await this.conversorHelper.javascriptValueToFlowObject(newFunctionArguments)
            )
            
            const hasDocumentationForMethod = this.moduleContext?.methods?.[name]?.description !== undefined
            const moduleMethodDocumentation = hasDocumentationForMethod ? this.moduleContext.methods[name].description : '' 
            await moduleMethod.appendDocumentation(await this.newString(moduleMethodDocumentation))
            await this._setattribute_(await this.newString(translatedFunctionName), moduleMethod)
        }
    }

    /**
     * This will override the _initialize_ method as we actually do many different stuff from when we initialize a
     * LibraryModule instead of a default FlowModule.
     * 
     * @param {string} moduleName - The name of the module, this is the original name AND NOT the translated name, we translate
     * the name of the module inside of this function
     * @param {import('../../memory/record')} scope - The scope of the module, usually this will be the PROGRAM record, because we
     * initialize this module when the program starts.
     */
    async _initialize_(moduleName, scope) {
        this.isModuleInitialized = true
        this.conversorHelper = new libraryHelpers.Conversor(this.settings)
        
        this.moduleContext = this.settings.library[moduleName] 
        const isModuleContextDefined = this.moduleContext !== undefined
        moduleName = isModuleContextDefined ? this.moduleContext.moduleName : moduleName
        const structParameters = await this.#translateStructParameters()
        await super._initialize_(moduleName, structParameters)
        await this.#translateMethods(scope)
        return this
    }
    
    async _setattribute_(name, value) {
        return await this.#lazyInitializeTheModule('_setattribute_', name, value)
    }    

    async _getattribute_(name) {
        return await this.#lazyInitializeTheModule('_getattribute_', name)
    }    

    async _string_() {
        return await this.#lazyInitializeTheModule('_string_')
    }

    async _dict_() {
        return await this.#lazyInitializeTheModule('_dict_')
    }
    
    /**
     * It's obligatory for you to define the documentation of your modules, if you do not provide the
     * `documentation` then it will fail. This is because we need the user to be able to see what the function
     * does and 
     */
    async _documentation_() {
        await this.#lazyInitializeTheModule('_documentation_')
        const isModuleContextDefined = typeof this.moduleContext === 'object' && this.moduleContext?.description !== undefined && 
            typeof this.moduleContext.description === 'string'
        if (isModuleContextDefined === true) {
            return await this.conversorHelper.javascriptValueToFlowObject(this.moduleContext.description)
        } else {
            return await super._documentation_()
        }
    }

    /**
     * By default, flow is kinda "untied" to reflow itself. This means that everything you do is going to interact with the service itself.
     * But on the service we might need some stuff, for example, the documentation of the module so users can see and understand what the module
     * does. What are the functions and so on.
     * 
     * So we access this function from the service in order to get the proper documentation of the module. Since we don't want to rely on a REALLY LONG
     * LIST of objects, we just keep it inside of the builtin modules. In other words, this means that every module should implement it's own documentation
     * function.
     * 
     * @param {string} language - The language that you are translating to.
     * 
     * @returns {Promise<object>} The documentation of the module as an object.
     */
    static async documentation(language) {}
}

/**
 * This class is used to create structs. Be aware, those structs are structs created dynamically directly from javascript
 * NOT structs created from Flow modules itself. For example: 
 * 
 * In the HTTP module, when we make a web request we should return the Response from the request. This Response will be a 
 * struct, this struct will contain the content data, the json data, the status code and so on.
 * 
 * So for example:
 * ```
 * response = HTTP.get("http://api.notion.com/v1/database")
 * 
 * # will be
 * 
 * response.status_code == 200
 * response.json == {
 *      "status": "ok"
 *      "data": {
 *          "column1": "1"
 *          "column2": 20
 *      }
 * }
 * ```
 *
 * This means that the user will be able to extract the data by retrieving the attributes of the struct.
 * Of course we could just return a simple dictionary, but we think that structs offers more flexibility.
 * 
 * I know that this is strange, because this extends the FlowModule and not the FlowStruct. That's because 
 * a FlowStruct is supposed to be static and if you see it clearly, _initialize_ will return a new FlowStruct
 * directly and not a FlowModule.
 * 
 * How do we create a new LibraryStruct?
 * 
 * You must define your struct like so: 
 * ```
 * class HTTPResponse extends LibraryStruct {
 *      __moduleName = 'HTTP'
 *      
 *      async _initialize_(response) {
 *          this.__attributes = {
 *              statusCode: 200,
 *              content: 'teeeeste',
 *              json: { a: true, b: 1 }
 *          }
 *          return await super._initialize_()
 *      }
 * }
 * ```
 * 
 * - `__moduleName` is obligatory, this will be the module that will create this struct, this is used so we can
 * translate the struct and attributes of the struct. So instead of ```response.statusCode``` the user will
 * do ```response.código_de_status```.
 * - `__attributes` is obligatory to be defined inside the `_initialize_`, that'll be the attributes of the struct
 * so this means the struct created from HTTPResponse will have the attributes: `statusCode`, `content` and `json`
 * This will be translated (the language, and the javascript object to a flowDict).
 * - Last but not least you should define all of the logic inside on the _initialize_ method, returning the 
 * `super._initialize_` response. I don't know if this is the best or easier API but this generally works.
 */
class LibraryStruct extends FlowModule {
    __moduleName = ''
    __attributes = {}

    /**
     * @param {import('../../settings').Settings} settings - The settings object that we pass through Flow.
     * @param {string} structName - The name of the struct so we can search through the Context.
     */
    constructor(settings, structName) {
        super(settings)
        this.originalStructName = structName
    }

    /**
     * This method will translate the attributes object in the __attributes property to the context defined by the user.
     * This will just translate each key in the javascript object, after that the attributes will be translated to a new
     * javascript object with each key translated.
     * 
     * For example:
     * `statusCode` will be `código_de_status`
     * `content` will be `conteúdo`
     * and so on.
     * 
     * @param {import('../../context').BultinLibraryModuleContext} moduleContext - The module context of the library so we can use to
     * translate all of the attributes of the module.
     * 
     * @returns {object} - The `__attributes` object with each key translated.
     */
    async #translateAttribute(moduleContext) {
        const structContext = moduleContext?.structs?.[this.originalStructName] !== undefined ? 
                              moduleContext.structs[this.originalStructName] : {}
        this.structName = structContext?.structName !== undefined ? structContext.structName : this.originalStructName
    
        let translatedAttributes = {}
        for (const [attributeName, value] of Object.entries(this.__attributes)) {
            if (structContext.attributes && structContext.attributes[attributeName]) {
                translatedAttributes[structContext.attributes[attributeName]] = value
            } else {
                translatedAttributes[attributeName] = value
            }
        }

        return translatedAttributes
    }

    /**
     * You will generally use this function to create a new LibraryStruct. This is a factory method
     * that will handle everything for you for creating new LibraryStructs.
     * 
     * @param {import('../../settings').Settings} settings - The settings object that we pass through Flow.
     * @param {string} structName - The name of the struct so we can search through the Context.
     * @param {any} args - All of the arguments that you want to pass to the _initialize_ method.
     * For example:
     * ```
     * class HTTPResponse extends LibraryStruct {
     *      __moduleName = 'HTTP'
     *      
     *      async _initialize_(response) {
     *          this.__attributes = {
     *              statusCode: 200,
     *              content: 'teeeeste',
     *              json: { a: true, b: 1 }
     *          }
     *          return await super._initialize_()
     *      }
     * }
     * ```
     * Check that the _initialize_ method has the same arguments: `response`.
     * 
     * So we call it like this:
     * 
     * ```
     * const responseObject = { hello: 'world' }
     * HTTPResponse.new(this.settings, 'HTTPResponse', responseObject)
     * ```  
     * 
     * I think that there are better ways to do this but this is what we got at the meantime.
     * 
     * @returns {Promise<FlowStruct>} - Return a new FlowStruct with the attributes passed and translated.
     */
    static async new(settings, structName, ...args) {
        return await (new this(settings, structName))._initialize_(...args)
    }

    /**
     * Overrides the _initialize_ method so we can translate the attributes of the struct and instead of returning
     * the module we will return directly the struct created from it.
     * 
     * That's the main difference of the default behaviour of a FlowModule. Besides that it's simple:
     * first we initialize a conversorHelper to transform JS data into flow data, then we get the moduleContext
     * which is an object that will be used to translate this struct.
     * Last but not least we translate the attributes of the struct and then we initialize THE MODULE.
     * 
     * After initializing the module we will return the struct created from the module directly.
     * 
     * @returns {Promise<FlowStruct>} - Returns a new FlowStruct with the __attributes defined and translated.
     */
    async _initialize_() {
        const conversorHelper = new libraryHelpers.Conversor(this.settings)
        const moduleContext = this.settings.library[this.__moduleName] 

        const translatedAttributes = await this.#translateAttribute(moduleContext)
        const attributes = await conversorHelper.javascriptValueToFlowObject(translatedAttributes)
        await super._initialize_(this.structName, await FlowNull.new(this.settings))
        const response =  await FlowStruct.new(this.settings, attributes, this)
        return response
    }
}

module.exports = {
    LibraryModule,
    LibraryStruct
}