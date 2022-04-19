
/**
 * Why do we create actions instead of using the default actions sequelize gives us?
 * 
 * because it's easier for us to manage the state of the objects.
 * 
 * To understand this you need to understand how migrations work, so read `index/`
 * 
 * 
 */
class Action {
    stateForwards(appName, state) {}
    async run(engineInstance, fromState, toState) {}
}
// ------------------------------------------------------------------------------------------
/**
 * Action for creating a model, when a model is created use this action passing the
 * model name, the attributes and the object with the options, options are stuff like
 * primary key type, table name and other configurations, you should really check ./database/models for
 * further explanation.
 * 
 * @param {String} modelName - The name of the model.
 * @param {Object} attributes - The object of attributes, check ./database/models/fields for reference of the field types.
 * @param {Object} options - The options key, this is used to define the primary key of the table, the table name and other 
 * configurations.
 */
class CreateModel extends Action {
    constructor (modelName, attributes, options={}) {
        super()
        this.modelName = modelName
        this.attributes = attributes
        this.options = options
    }

    stateForwards(appName, state) {
        state.addModel(
            appName,
            this.modelName,
            this.attributes,
            this.options
        )
    }

    async run(transaction, engineInstance, fromState, toState) {
        const fromModel = toState[this.modelName]
        const toModel = toState[this.modelName] 
        await engineInstance.addModelMigration(transaction, toModel, fromModel)
    }
}
// ------------------------------------------------------------------------------------------
/**
 * This action on the migration is responsible for deleting the actual model from the database, when a model is deleted we run this
 * 
 * @param {String} modelName - The name of the model that was deleted from the database.
 */
class DeleteModel extends Action {
    constructor (modelName) {
        super()
        this.modelName = modelName
    }

    stateForwards(appName, state) {
        state.deleteModel(
            this.modelName
        )
    }
    async run(transaction, engineInstance, fromState, toState) {
        const fromModel = fromState[this.modelName]
        await engineInstance.removeModelMigration(transaction, fromModel)
    }
}
// ------------------------------------------------------------------------------------------
class ChangeModel extends Action {
    constructor (modelName, optionsBefore, optionsAfter, options={}) {
        super()
        this.modelName = modelName
        this.optionsBefore = optionsBefore
        this.optionsAfter = optionsAfter
        this.options = options
    }

    stateForwards(appName, state) {
        state.changeModel(appName, this.modelName, this.optionsBefore, this.optionsAfter)
    }

    async run(transaction, engineInstance, fromState, toState) {
        const toModel = toState[this.modelName] 
        const fromModel = fromState[this.modelName] 
        await engineInstance.changeModelMigration(transaction, toModel, fromModel, this.modelName)
    }
}
// ------------------------------------------------------------------------------------------
class RenameModel extends Action {
    constructor (oldModelName, newModelName) {
        super()
        this.oldModelName = oldModelName
        this.newModelName = newModelName
    }

    stateForwards(appName, state) {
        state.renameModel(appName,this.oldModelName, this.newModelName)
    }
}
// ------------------------------------------------------------------------------------------
class CreateColumn extends Action {
    constructor (modelName, attributeName, attributeDefinition) {
        super()
        this.modelName = modelName
        this.attributeName = attributeName
        this.attributeDefinition = attributeDefinition
    }

    stateForwards(appName, state) {
        state.addColumn(appName, this.modelName, this.attributeName, this.attributeDefinition)
    }

    async run (transaction, engineInstance, fromState, toState) {
        const toModel = toState[this.modelName]
        const fromModel = fromState[this.modelName]
        await engineInstance.addColumnMigration(transaction, toModel, fromModel, this.attributeName)
    }
}
// ------------------------------------------------------------------------------------------
class ChangeColumn extends Action {
    constructor (modelName, attributeName, attributeDefinitionBefore, attributeDefinitionAfter) {
        super()
        this.modelName = modelName
        this.attributeName = attributeName
        this.attributeDefinitionBefore = attributeDefinitionBefore
        this.attributeDefinitionAfter = attributeDefinitionAfter
    }

    stateForwards(appName, state) {
        state.changeColumn(appName, this.modelName, this.attributeName, this.attributeDefinitionAfter)
    }

    async run(transaction, engineInstance, fromState, toState) {
        const fromModel = fromState[this.modelName]
        const toModel = toState[this.modelName]
        await engineInstance.changeColumnMigration(
            transaction, toModel, fromModel, this.attributeDefinitionBefore, this.attributeDefinitionAfter
        )
    }
}
// ------------------------------------------------------------------------------------------
class RenameColumn extends Action {
    constructor (modelName, attributeNameAfter, attributeNameBefore, attributeDefinition) {
        super()
        this.modelName = modelName
        this.attributeNameAfter = attributeNameAfter
        this.attributeNameBefore = attributeNameBefore
        this.attributeDefinition = attributeDefinition
    }

    stateForwards(appName, state) {
        state.renameColumn(appName, this.modelName, this.attributeNameBefore, this.attributeNameAfter, this.attributeDefinition)
    }

    async run(transaction, engineInstance, fromState, toState) {
        const fromModel = fromState[this.modelName]
        const toModel = toState[this.modelName]
        await engineInstance.renameColumnMigration(
            transaction, toModel, fromModel, this.attributeNameBefore, this.attributeNameAfter
        )
    }
}
// ------------------------------------------------------------------------------------------
class RemoveColumn extends Action {
    constructor (modelName, attributeName) {
        super()
        this.modelName = modelName
        this.attributeName = attributeName
    }

    stateForwards(appName, state) {
        state.deleteColumn(appName, this.modelName, this.attributeName)
    }

    async run(transaction, engineInstance, fromState, toState) {
        const fromModel = fromState[this.modelName]
        const toModel = toState[this.modelName]
        await engineInstance.removeColumnMigration(transaction, toModel, fromModel, this.attributeName)
    }
}
// ------------------------------------------------------------------------------------------
/**
 * Run a Javascript function action, this action can make queries or requests.
 * Usually we pass a transaction to your code, and the migration runs inside of a transaction.
 * We recommend always using the transaction object of the engine.
 * 
 * This will guarantee that if anything fails the changes will not be commited to the database.
 * 
 * At the same time we send the engine instance and the state.
 * 
 * Instead of importing your models and making queries directly, always try to use `state`.
 * `state` is a object where each key is the Model name. This will guarantee that your state is up to date when
 * the query is running.
 * 
 * For example: You create a query like
 * ```
 * const { Field }  = require('../models')
 * 
 * Field.instance.findOne({
 *      where: {
 *          createdAt: yesterday
 *      }
 * })
 * ```
 * 
 * But many migrations later you delete the `createdAt` attribute from your model. If you import this model directly this
 * query will fail when you run the query again. So instead you shoud make it like this
 * 
 * ```
 * const { Field, ...rest } = state
 * 
 * Field.instance.findOne({
 *      where: {
 *          createdAt: yesterday
 *      }
 * })
 * ```
 * 
 * This will get the state when the query is running so the model is up to date of the migration evaluation.
 * 
 * Example of file:
 * ```
 * 'use strict'
 * 
 * async function createNewFieldType(transaction, engine, state) {
 *      const FieldType = state['FieldType']
 *      await FieldType.instance.create({
 *          type: 'number',
 *          labelName: 'Number',
 *          order: 1,
 *          isDynamicEvaluated: true
 *      }, {transaction: transaction})
 * }
 * 
 * module.exports = {
 *      engine: "SequelizeEngine",
 *      dependency: "31_auto_migration_1635121583472",
 *      operations: (models, actions) => {
 *          return [
 *              new actions.RunJS(createNewFieldType)
 *          ]
 *      }
 * }
 * ```
 * 
 * @param {Function} code - The code to run when the migration runs
 * @param {Function} returnCode - The code to run to rollback the migration, we haven't done it so this will not affect anything.
 */
class RunJS extends Action {
    constructor(code, returnCode=null) {
        super()
        this.code = code
        this.returnCode = returnCode
    }

    async run(transaction, engineInstance, fromState, toState) {
        let state = {}
        Object.keys(toState).forEach(modelName => {
            state[modelName] = toState[modelName].original
        })
        await Promise.resolve(this.code(transaction, engineInstance, state))
    }
}

module.exports = {
    CreateModel,
    DeleteModel,
    ChangeModel,
    RenameModel,
    CreateColumn,
    ChangeColumn,
    RenameColumn,
    RemoveColumn,
    RunJS
}

