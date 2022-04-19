/** @module config/database/models */

const fields = require('./fields')

class AbstractModelClassError extends Error {}


/**
 * Retrieve the instance managers from the instance.
 * 
 * @param {*} instance 
 * @returns {object}
 */
const retrieveManagers = (instance) => {
    let managers = {}

    Object.keys(instance).forEach(key => {
        if (instance[key] instanceof Manager) {
            managers[key] = instance[key]
        }
    })

    Object.keys(instance.constructor).forEach(key => {
        if (instance.constructor[key] instanceof Manager) {
            managers[key] = instance.constructor[key]
        }
    })
    return managers
}

/**
 * Because we define the attributes in the attributes object inside of the class, if we extend
 * this class from another class (like a inheritance in OOP) we will not be able to work properly
 * because the `attributes = {}` object from the child class will overwrite the `attributes` of the parent class
 * because of this what we do is define a `abstracts` class in the children
 */
const handleAbstracts = (Model, instance) => {
    const composeAbstract = (abstractClass, definedAbstracts=[]) => {
        if (definedAbstracts.includes(abstractClass.name)) {
            throw new AbstractModelClassError(`The defined abstract '${abstractClass.name}' is circular, please check it again and make sure you don't define circular abstract.`)
        } else {
            const abstractInstance = new abstractClass()
            const abstractInstanceManagers = retrieveManagers(abstractInstance)
            const abstractMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(abstractInstance))
            if (abstractInstance.abstracts) {
                for (const abstractOfAbstractClass of abstractInstance.abstracts) {
                    composeAbstract(abstractOfAbstractClass, definedAbstracts)
                }
            }
            if (abstractInstance.attributes) {
                instance.attributes = {
                    ...instance.attributes,
                    ...abstractInstance.attributes,
                }
            }
            if (abstractInstance.options) {
                instance.options = {
                    ...instance.options,
                    ...abstractInstance.options,
                    abstract: false
                }
            }
            if (typeof abstractInstanceManagers === 'object') {
                Object.entries(abstractInstanceManagers).forEach(([managerName, manager]) => {
                    instance[managerName] = manager
                })
            }
            
            for (const abstractMethod of abstractMethods) {
                if (abstractMethod !== 'constructor') {
                    Model.prototype[abstractMethod] = abstractInstance[abstractMethod]
                }
            }
        }
    }
    
    if (instance.abstracts) {
        const definedAbstracts = [instance.constructor.name]
        for (const abstractClass of instance.abstracts) {
            composeAbstract(abstractClass, definedAbstracts)
        }
    }
}


/**
 * This is used for creating managers, a manager is a class
 * that holds many queries for a particular model, so instead of making queries everywhere in your code
 * you are able to add queries to a particular file in your code and then this query can be used everywhere
 * This was inspired by Django's manager: https://docs.djangoproject.com/en/3.2/topics/db/managers/ 
 */
class Manager {
    constructor() {
        this.engineInstance = null
        this.instance = null
    }
    
    /**
     * @returns {import('sequelize').Model}
     */
    getInstance() {
        if (this.instance !== null) {
            return this.instance
        } else {
            throw new Error('Manager instance is not initialized.')
        }
    }

    /**
     * @returns {import('../engines/sequelize')}
     */
    getEngineInstance() {
        if (this.engineInstance !== null) {
            return this.engineInstance
        } else {
            throw new Error('Manager engine instance is not initialized.')
        }
    }
}

/**
 * ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 * / IMPORTANT: Beaware, in sequelize docs https://sequelize.org/master/manual/model-instances.html the docs give us this example:    /
 * / const jane = User.build({ name: "Jane" });                                                                                       /
 * / console.log(jane instanceof User); // true                                                                                       /
 * / console.log(jane.name); // "Jane"                                                                                                /
 * /                                                                                                                                  /
 * / The second line is NOT True here in reflow, instead you should do                                                                /
 * / console.log(jane instanceof User.instance);                                                                                      /
 * ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 * 
 * This class is used for initializing a model. This will work similar to django except that instead of 
 * `objects` we use `instance` to make queries. So in other words, if you want to make queries directly you will need to use. Also the instance
 * will hold the actual instance of the model. Beware in the attention card above.
 * 
 * >>> ModelName.instance.findOne()
 * or
 * >>> ModenName.instance.create()
 * 
 * and so on. 
 * 
 * For creating Models it is simple, you've got 4 objects: `attributes`, `objects`, `managers` and `abstracts`
 * 
 * The first one is obligatory, the rest is optional.
 * For `attributes` it is simple, just define the attributes of your model there as you would in sequelize
 * normally:
 * 
 * Example:
 * In sequelize we define like:
 * >>> sequelize.define('User', {
 *      firstName: {
 *          type: DataTypes.STRING,
 *          allowNull: false
 *      },
 *      lastName: {
 *          type: DataTypes.STRING
 *      }
 *}, {
 *      tableName: 'user'    
 })
 *
 * Notice that 'User' is the name of the model, the second argument of the `.define()` function is the attributes,
 * it is exactly this object we will put in the attributes parameter. The second argument of the function is the
 * sequelize `options` sequelize parameter where we can define indexes, tableName and many other configuration.
 * You might want to check sequelize documentation for this: https://sequelize.org/master/manual/model-basics.html
 * 
 * Okay so how do we rewrite this to something more concise and readable?
 * class User extends Model {
 *      attributes = {
 *          firstName: {
 *              type: DataTypes.STRING,
 *              allowNull: false
 *          },
 *          lastName: {
 *              type: DataTypes.STRING
 *          }
 *      }
 * 
 *      options = {
 *          tableName: 'user'
 *      }
 * 
 *      getFullName() {
 *          return this.firstName + this.lastName
 *      }
 * 
 *      custom = new CustomManager()
 * }
 * 
 * Simple and elegant. You will notice the `attributes` is defined, the options is optional, so instead of defining an
 * empty object you can totally omit it if you want.
 * 
 * The `.getFullName` function is an instance function it will be appended to the instance so you can make a query like
 * and then it will return an User model, this model will have the method.
 * 
 * >>> const response = await User.instance.findOne()
 * >>> response.getFullName()
 * 
 * We underline many stuff from sequelize so you, the programmer, don't need to worry about tooling, it will just work.
 * 
 * Take a notice at manager. Manager is for building custom managers similar to django managers.
 * Instead of making queries through your code you can keep all of your queries inside of managers and just
 * define them in your model.
 * 
 * For the CustomManager, this will be our definition of a custom manager 
 * >>> class CustomManager extends Manager {
 *         createUser(firstName, lastName) {
 *              return this.instance.create({ firstName: firstName, lastName: lastName })
 *         }
 *     }
 * 
 * Okay so now we don't need to create a new user calling `.create` directly, instead we can use
 * 
 * User.custom.createUser('Jane', 'Doe')
 * 
 * This way we can keep queries more concise and representative by just making functions. Also
 * you can have the hole power of linting VSCode and other IDEs give you.
 */
class Model {
    abstracts = []

    options = {}

    attributes = {}

    static _defaultOptions = {
        autoId: true,
        primaryKeyField: new fields.BigAutoField({}),
        abstract: false,
        underscored: true,
        tableName: null,
        managed: true,
        ordering: [],
        indexes: [],
        customOptions: {}
    }

    /**
     * This will do any operation on the model level passing to the field level, this way the fields can work by themselves without relying at
     * all on the options or the model instance. 
     * 
     * We pass stuff like the attribute name where this field was defined in, if it is underscored or not and many other further operations
     */
    #initializeAttributes() {
        for (const attributeName of Object.keys(this.attributes)) {
            this.attributes[attributeName].attributeName = attributeName
            this.attributes[attributeName].underscored = this.options.underscored !== undefined ? this.options.underscored : this.attributes[attributeName].underscored
            this.attributes[attributeName].initialize()
        }
    }

    #initializeOptions() {
        this.options = { ...Model._defaultOptions, ...this.options }
        // if table name is not define attribute the name of the model as the name of the table.
        if (this.options.autoId) {
            const primaryKeyFieldInstance = this.options.primaryKeyField
            primaryKeyFieldInstance.attributeName = 'id'
            primaryKeyFieldInstance.initialize()
            
            this.attributes = {
                id: primaryKeyFieldInstance,
                ...this.attributes,
            }
        }
    }

    /**
     * Effectively initializes the model in the orm engine used.
     * 
     * @param {object} Model - The actual model class, used because we append the instance of the model
     * directly to the class itself so the user can simply make `User.instance.findAll({})...`, this way
     * you don`t need to use `new User()` everytime or `getRepository()` everytime, as long as the application exists
     * you can use the instance of the model and make the queries.
     * @param {object} engineInstance - The instance of the engine used, this is the instance of the engine used. Check 
     * `../engines/engine.js`
     * @param {string} modelName - The name of the model to use. Sometimes the engine just permits one model name while the
     * engine is running. Because of that this can be quite complicated because on the migrations we generate the state model
     * and the original model simultaneously. So we create a model name with a simple prefix so it doesn't clash, this permits us
     * from actually creating the models easily and checking them
     * 
     * @returns {object} - The instance of the model generated by the user. Since the instance is appended to the class itself
     * we do not use it, but it can be quite handy if you need the it.
     */
    initialize(Model, engineInstance, modelName=null) {
        if (modelName === null) {
            modelName = this.constructor.name
        }
        handleAbstracts(Model, this)
        this.#initializeAttributes()
        this.#initializeOptions()

        const instanceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
            .filter(instanceMethod => instanceMethod !== 'constructor').map(instanceMethodName => ({ [instanceMethodName]: this[instanceMethodName]}))
        
        const instance = engineInstance.defineModel(modelName, this.attributes, this.options, instanceMethods)
        if (instance !== null) {
            Model.instance = instance

            const managers = retrieveManagers(this)
            if (managers) {
                for (const [managerName, manager] of Object.entries(managers)) {
                    manager.instance = instance
                    manager.engineInstance = engineInstance
                    Model[managerName] = manager
                }
            }
            Model.attributes = this.attributes
            Model.options = this.options
        }

        return instance
    }
}


module.exports = {
    Model,
    Manager,
    fields
}