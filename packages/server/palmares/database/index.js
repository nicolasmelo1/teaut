/**
 * This file define everything about the database connection, models, migrations and to make migrations, any additional
 * logic regarding databases should be added here.
 * 
 * This is tightly integrated with Sequelize, but we understand that other ORM might come in the near future with a better
 * performance and support. For that 2 things is required:
 * 
 * >>>>DONE<<<<<
 * 1 - Create a common object definition for defining models, it'll be a object with some default parameters that will be translated to the
 * used engine. For example:
 * We define models in sequelize like
 * ```
 * class User extends Model {}
 * User.init({
 *      // Model attributes are defined here
 *      firstName: {
 *          type: DataTypes.STRING,
 *          allowNull: false
 *      },
 *      lastName: {
 *          type: DataTypes.STRING
 *          defaultValue: 'Melo'
 *      }
 * }, {
 *      // Other model options go here
 *      modelName: 'User' // We need to choose the model name
 * });
 * ```
 * In typeorm the same model can be defined as
 * ```
 * const User = new EntitySchema({
 *   name: "user",
 *   columns: {
 *       id: {
 *           type: Number,
 *           primary: true,
 *           generated: true
 *       },
 *       firstName: {
 *          type: String,
 *          nullable: false
 *       },
 *       lastName: {
 *          type: String,
 *          default: 'Melo'
 *       }
 *   }
 * });
 * ```
 * Do you see that on both, how you define the model changes? That's the idea. We will create a new common object language
 * to define the models and that will be translated in real time to the engine that we are using.
 * >>>>DONE<<<<<
 * # DONE 
 * 2 - Create a Engine, the engine is what will power the migrations, the database and so on.
 * 
 * One cannot exist without the other, these 2 things should be done in parallel.
 * For item number 2 be aware that your Engine must have the following methods:
 * - Method to initilize the database instance // DONE
 * - Map itself to a model.
 * - Method for translation from the common object structure to the ORM structure // DONE
 * - Method for translation from the ORM structure to the common object structure // DONE
 * - Method for handling each migration (not that difficult to do) action. // DONE
 * - Methods for common queries like creating, updating, filtering and so on.
 * - How to serialize it in serializers. // DONE
 * 
 * It's not that difficult to do, but it is tedious, that's why i prefered to integrate it tightly with sequelize 
 * at first.
 * At this stage it's almost like we will have created a new ORM, the idea will be that the ORM library we are dealing
 * with will only handle the low level translation from Javascript to the Database and so on. But how we will create queries, how
 * we will create models, how we will handle migrations, everything will be handled by us.
 * # DONE
 *  
 * 3 - As said in 2, we need to create a common query structure, it will be something like a big json/object with many nested objects.
 * 
 * The idea is that, with this we will have just one query syntax for creating, updating, filtering and managing data. This syntax will
 * then be translated by the engine itself like sequelize for example. The user will be able to use the engine model if he wants a better grained
 * querying and last but not least we would be able to change engines without needing to leave the conventional querying syntax defined.
 * 
 * For example:
 * ```
 * {
 *      model: 'User',
 *      selects: '__all__',
 *      where: {
 *          and: {
 *              in: {
 *                  username: 'teaut',
 *              },
 *              id: 1
 *          }
 *      }
 * }
 * ```
 * This example is not how the user will WRITE the query but how it all would be structured at the end, we would hide it all in many functions and a nice syntax.
 * 
 * This example would then be used by sequelize and then it would translate to an actual query and execute it.
 * The result would then be appended to the model class and we would not need to know even what engine that we are using.
 * Imagine doing the same query for either a SQL or a NoSQL database and changing between them. This is the actual GO TO to the database part of this
 * framework. After that we would have the database part pretty much completed and good enough for almost all usages.
 * 
 * This would be better than django and other frameworks because all of them creates their own ORM. Which is good if you have plenty of time to nail it perfectly.
 * We are tying ourselves to already existing ORMS but defining our own syntax on top of them so you will be able to change which ORM you want to use underlying the
 * application but don't change anything at all on how you write queries or models. It will make this application significanlty slower though, but i don't care.
 * if the productivity is a lot better the compromise will be really appreciated.
 */

const { SequelizeEngine } = require('./engines')

const { retrieveModels } = require('./helpers')
const models = require('./models')
const logger = require('../logging')

let engineInstance = null

/**
 * Enable lazy loading associations, something that is not possible with raw sequelize.
 * 
 * This way we have a particular way of defining related fields in the models, but it's guaranteed to 
 * work most of the time
 * 
 * @param {settings.js} settings - The settings file.
 * @param {Array} internalModels - The models that will not be considered when making automatic migrations and all that stuff,
 * those are usually meant to be used internally only.
 * @returns {object}
 */
 function initialize(settings, internalModels=[]) {
    engineInstance = new SequelizeEngine(settings.DATABASE)
    
    logger.INFO.LOADING_DATABASE()
    // From bellow it doesn't need to be changed
    let loadedModels = retrieveModels(settings)
    loadedModels = loadedModels.map(module => {
        const model = new module.model()
        const initializedModel = model.initialize(module.model, engineInstance)
        return {
            appName: module.appName,
            original: model,
            initialized: initializedModel
        }
    })

    internalModels = internalModels.map(modelClass => {
        const model = new modelClass()
        const initializedModel = model.initialize(modelClass, engineInstance)
        return {
            original: model,
            initialized: initializedModel
        }
    })

    logger.INFO.LOADED_DATABASE()
    return {
        engineInstance,
        models: loadedModels,
        internalModels: internalModels
    }
}

async function close() {
    logger.INFO.CLOSING_DATABASE()
    if (engineInstance) {
        await engineInstance.close()
    }
}

function getEngineInstance() {
    return engineInstance
}

module.exports = {
    getEngineInstance,
    initialize,
    close,
    models
}