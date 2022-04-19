/**
 * @module config/database/engines/engine
 */

const models = require('../models')

class DatabaseConnectionError extends Error {}
class UnableToDefineModelError extends Error {}


class Engine {
    constructor({engine, databaseName, url=null, username=null, password=null, host=null, port=null, extraOptions={}}) {
        this.engineInstance = null
    }

    defineModel(...attribute) {
        throw new UnableToDefineModelError('Could not define the model, please make sure you implement this method in your engine')
    }
    
    /**
     * Used for retrieving the default attributes of the fields, those are the attributes defined in `Field` class.
     * Those attributes are default for every field type. 
     * For relatedFields like ForeignKey or OneToOne field we change the fieldName of the attribute adding the id in front.
     * This is only if fieldName option is not defined for the field, otherwise we set the fieldName.
     * This will be defined for allEngines since it applies for all engines that translate objects to the database.
     * 
     * @param {String} modelName - The name of the model, the actual class name.
     * @param {String} fieldName - The name of the field in your model. This is each key in the `attributes` object of the model.
     * @param {models.fields.Field} fieldDefinition - The Field instance defined in the model.
     * @param {Object} modelOptions - The `options` object of the model instance.
     * @param {Function} callbackForIndex - A callback function for defining indexes for your fields, this way the engine can handle indexes.
     * 
     * @returns {Object} - {
     *  primaryKey: {Boolean},
     *  allowNull: {Boolean},
     *  defaultValue: {Any},
     *  unique: {Boolean},
     *  validate: {
     *     notNull: {Boolean},
     *  },
     *  fieldName: {String},
     *  field: {String},
     * ...fieldDefinition.customAttributes
     * }
     */
    getDefaultAttributes(modelName, fieldName, fieldDefinition, modelOptions, callbackForIndex=(modelName, fieldName, fieldDefinition, modelOptions) => {}) {
        if (fieldDefinition.dbIndex || fieldDefinition.unique) {
            callbackForIndex(modelName, fieldName, fieldDefinition, modelOptions)
        }

        fieldName = fieldDefinition.fieldName !== undefined ? fieldDefinition.fieldName : fieldDefinition.attributeName
        return {
            primaryKey: fieldDefinition.primaryKey,
            allowNull: fieldDefinition.allowNull,
            defaultValue: fieldDefinition.defaultValue,
            unique: fieldDefinition.unique,
            validate: {
                notNull: !fieldDefinition.allowNull,
            },
            fieldName: fieldName,
            field: fieldDefinition.databaseName,
            ...fieldDefinition.customAttributes
        }
    }

    /**
     * Start a new transaction on a function passing the parameters and the transaction object to the child function.
     * 
     * To use this you will not call the function directly but instead like this:
     * ```
     * const specialFunctionThatDoesSomethingSpecial = async (userId, companyId, transaction) => {
     *       // code here
     * }
     * 
     * const userId = 1
     * const companyId = 2
     * await engineInstance.transaction(specialFunctionThatDoesSomethingSpecial, userId, companyId)
     * ```
     * 
     * This will guarantee your function runs in a transaction while being able to pass the arguments.
     * The problem is, this is not a simple API for people that doesn't understand much so it's best if 
     * we try to abstract away the maximum that we can this functionality.
     * 
     * Some ideas are:
     * - Append each controller on a transaction by default (since most of the apis the user needs to use them explicitly this will not affect anything in the controllers
     * that does not use this functionality) //Done.
     * - Create a decorators so we can decorate functions and classes with it (needs babel with proposal decorators defined)
     * 
     * @param {Function} callback 
     * @param  {...any} rest 
     */
    async transaction(callback, ...rest) {
        const transact = undefined
        await Promise.resolve(callback(...rest, transact))
    }

    async removeColumnMigration(transaction, fromModel, attributeName) {}

}

module.exports = {
    Engine,
    DatabaseConnectionError
}