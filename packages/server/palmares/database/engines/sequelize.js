/**
 * @module config/database/engines/sequelize
 */

const { Sequelize, DataTypes, Model, Op } = require('sequelize')
const { Engine, DatabaseConnectionError } = require('./engine')
const models = require('../models')

/**
 * Offers a initial translation engine from Palmares database and palmares common 
 * setup language for databases to sequelize, it is not supposed to implement, at 
 * the current time, how you handle queries, and all that stuff.
 * 
 * For that stuff you will be dealing with the ORM by itself.
 */
class SequelizeEngine extends Engine {
    engineName = 'SequelizeEngine'

    #relatedFieldsToEvaluate = []
    definedModels = {}
    #indexes = {}
    #addHooksToUpdateDate = {}
    #queryInterface = null
    #indexesToAddOnNextIteration = []
    circularDependenciesInMigration = []

    /**
     * This is the constructor for sequelize, in other words this will initialize the sequelize engine with the default attributes and then pass it around.
     * 
     * @param {*} param
     */
    constructor({engine, databaseName, url=null, username=null, password=null, host=null, port=null, extraOptions={}}) {
        super({})
        if (![null, '', undefined].includes(url)) {
            this.engineInstance = new Sequelize(url)
        } else if (['mysql', 'mariadb', 'postgres', 'mssql'].includes(engine)) {
            this.engineInstance = new Sequelize(databaseName, username, password, {
                host: host,
                port: port,
                dialect: engine,
                ...extraOptions
            })
        } else {
            throw new DatabaseConnectionError(`Could not connect to the database. Are you sure it is up and running?`)
        }
        this.operations = {
            and: Op.and,
            or: Op.or,
            eq: Op.eq,
            ne: Op.ne,
            is: Op.is,
            not: Op.not,
            col: Op.col,
            gt: Op.gt,
            gte: Op.gte,
            lt: Op.lt,
            lte: Op.lte,
            between: Op.between,
            notBetween: Op.notBetween,
            all: Op.all,
            in: Op.in,
            notIn: Op.notIn,
            like: Op.like,
            notLike: Op.notLike,
            startsWith: Op.startsWith,
            endsWith: Op.endsWith,
            substring: Op.substring,
            iLike: Op.iLike,
            notILike: Op.notILike,
            regexp: Op.regexp,
            notRegexp: Op.notRegexp,
            iRegexp: Op.iRegexp,
            notIRegexp: Op.notIRegexp,
            any: Op.any,
            match: Op.match
        }
    }

    resetModels() {
        this.#relatedFieldsToEvaluate = []
        this.definedModels = {}
        this.#indexes = {}
        this.#addHooksToUpdateDate = {}
        this.#indexesToAddOnNextIteration = []
    }
    
    async close() {
        await this.engineInstance.connectionManager.close()
    }
    /**
     * translates the OnDelete operations to something that sequelize can understand.
     * 
     * @param {*} onDeleteAttribute 
     * @returns {String}
     */
    #translateOnDeleteOperations = (onDeleteAttribute) => {
        switch (onDeleteAttribute) {
            case models.fields.ON_DELETE.CASCADE:
                return 'CASCADE'
            case models.fields.ON_DELETE.SET_NULL:
                return 'SET NULL'
            case models.fields.ON_DELETE.SET_DEFAULT:
                return 'SET DEFAULT'
            case models.fields.ON_DELETE.RESTRICT:
                return 'RESTRICT'
        }
    }

    /**
     * We override the parent function because if we return null here we should not consider the 
     * translated field in the translated attributes.
     * 
     * @param {string} modelName - The name of the model to use.
     * @param {object} attributes - The attributes of the model. Defined in `attributes` object in the model class.
     * @param {object} modelOptions - The options of the model to define the table like it's name,  and so on.
     * 
     * @returns {object} - Returns the translated attributes. It's an object that each key is the attribute name and each value
     * is the translated attribute. We will use this object to define the attributes of the model.
     * 
     * For example:
     * ```
     * const User = sequelize.define("User", {
     *      name: DataTypes.TEXT,
     *      favoriteColor: {
     *          type: DataTypes.TEXT,
     *          defaultValue: 'green'
     *      },
     *      age: DataTypes.INTEGER,
     *      cash: DataTypes.INTEGER
     * })
     * ```
     * 
     * On the define function, check the second argument, it's an object that contains the attributes of the model.
     * 
     * On our engine we would define this model like 
     * ```
     * class User extends models.Model {
     *     fields = {
     *          name: new models.fields.TextField({allowNull: true}),
     *          favoriteColor: new models.fields.TextField({allowNull: true, defaultValue: 'green'}),
     *          age: new models.fields.IntegerField({allowNull: true}),
     *          cash: new models.fields.IntegerField({allowNull: true})
     *      }
     * }
     * ```
     * 
     * In the end, the fields key object in our model will be translated to the exact same object as the attributes object.
     */
    #translateFields(modelName, attributes, modelOptions) {
        let translatedAttributes = {}
        Object.entries(attributes).forEach(([fieldName, fieldData]) => {
            const translatedField = this.#translateField(modelName, fieldName, fieldData, modelOptions)
            if (translatedField !== null) {
                translatedAttributes[fieldName] = translatedField
            }
        })
        return translatedAttributes
    }
        
    /**
     * Translate the Field attribute to something that the engine (sequelize here) can understand and comprehend.
     * Not all of the default attributes might be supported for all engines and that's actually fine.
     * 
     * We handle all fields inside here except related fields like ForeignKey or OneToOne because we will evaluate later
     * in order to create the associations that we can use to fetch the data concatenated. Also we evaluate them later
     * because by doing so we can prevent circular imports for the associations.
     * 
     * @param {String} modelName - The name of the model you are working with, this is nothing more than the class name of the model.
     * @param {String} fieldName - The field name is the name of the attribute, for example, if you define your attribute like
     * > attributes = {
     *      firstName: new models.field.CharField({maxLength: 250, databaseName: 'field_name'})
     * }
     * the `databaseName` actually does not care
     * @param {Object} fieldDefinition - The model definition is just one instance of the models/fields. Can be a CharField a TextField and so on
     * and can also have custom options if you want to interact with the ORM directly.
     * @param {Object} modelOptions - The options of the model
     * 
     * @returns {object | null} - Returns null if you don't want to consider this field or an object, the object is an attribute definition
     * of sequelize. You can check here for reference: 
     * - https://sequelize.org/master/class/lib/model.js~Model.html#static-method-init (check the `attributes` object)
     */
    #translateField(modelName, fieldName, fieldDefinition, modelOptions) {
        const setIndexes = (modelName, fieldName, fieldDefinition, modelOptions) => {
            const newIndex = {
                unique: fieldDefinition.unique,
                fields: [fieldDefinition.databaseName]
            }
            if (this.#indexes[modelName] === undefined) {
                this.#indexes[modelName] = []
            }
            this.#indexes[modelName].push(newIndex)
        }

        // we convert auto now and auto now add values to the default DataTypes.Now from sequelize.
        if (fieldDefinition.autoNowAdd || fieldDefinition.autoNow) {
            fieldDefinition.defaultValue = DataTypes.NOW
        }

        if (fieldDefinition.autoNow) {
            if (this.#addHooksToUpdateDate[modelName] === undefined) {
                this.#addHooksToUpdateDate[modelName] = []
            } 
            this.#addHooksToUpdateDate[modelName].push({fieldName: fieldName, type: fieldDefinition.constructor.name})
        }

        // If it is not a related field we will get the default attributes otherwise we will return a null value indicatin
        // that we don't want to consider this field. After that we call `#evaluateRelatedFields` function to evaluate 
        // the relations.
        let defaultAttributes = {}
        defaultAttributes = this.getDefaultAttributes(modelName, fieldName, fieldDefinition, modelOptions, setIndexes)
        
        defaultAttributes.validate.notEmpty = !fieldDefinition.allowBlank
        // For every field type, return a new object containing the data of the ORM to map to. Not 
        // all fields are mapped but i tried to keep the ones that are most used and supported by most ORMs
        switch (fieldDefinition.constructor.name) {
            case models.fields.CharField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.STRING(fieldDefinition.maxLength),
                    validate: {
                        ...defaultAttributes.validate
                    }
                }
            case models.fields.UUIDField.name:
                if (fieldDefinition.autoGenerate) {
                    defaultAttributes.defaultValue = DataTypes.UUIDV4
                }
                return {
                    ...defaultAttributes,
                    type: DataTypes.UUID,
                    validate: {
                        ...defaultAttributes.validate
                    }
                }
            case models.fields.TextField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.TEXT,
                    validate: {
                        ...defaultAttributes.validate
                    }
                }
            case models.fields.AutoField.name: 
                return {
                    ...defaultAttributes,
                    autoIncrement: true,
                    autoIncrementIdentity: true,
                    type: DataTypes.INTEGER,
                    validate: {
                        ...defaultAttributes.validate,
                        isNumeric: true
                    }
                }
            case models.fields.BigAutoField.name: 
                return {
                    ...defaultAttributes,
                    autoIncrement: true,
                    autoIncrementIdentity: true,
                    type: DataTypes.BIGINT,
                    validate: {
                        ...defaultAttributes.validate,
                        isNumeric: true,
                        isInt: true
                    }
                }
            case models.fields.IntegerField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.INTEGER,
                    validate: {
                        ...defaultAttributes.validate,
                        isNumeric: true,
                        isInt: true
                    }
                }
            case models.fields.BigIntegerField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.BIGINT,
                    validate: {
                        ...defaultAttributes.validate,
                        isNumeric: true,
                        isInt: true
                    }
                }
            case models.fields.DecimalField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.DECIMAL(fieldDefinition.maxDigits, fieldDefinition.decimalPlaces),
                    validate: {
                        ...defaultAttributes.validate,
                        isNumeric: true
                    }
                }
            case models.fields.BooleanField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.BOOLEAN
                }
            case models.fields.DatetimeField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.DATE
                }
            case models.fields.DateField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.DATEONLY
                }
            case models.fields.TimeField.name:
                return {
                    ...defaultAttributes,
                    type: DataTypes.TIME
                }
            case models.fields.ForeignKeyField.name:
                this.#relatedFieldsToEvaluate.push({
                    relationType: fieldDefinition.constructor.name,
                    relatedName: fieldDefinition.relatedName,
                    fieldName: fieldName,
                    foreignKeyOptions: defaultAttributes,
                    fieldOptions: fieldDefinition,
                    fromModel: modelName,
                    relatedTo: fieldDefinition.relatedTo
                })
                return null
            case models.fields.OneToOneField.name:
                this.#relatedFieldsToEvaluate.push({
                    relationType: fieldDefinition.constructor.name,
                    relatedName: fieldDefinition.relatedName,
                    fieldName: fieldName,
                    foreignKeyOptions: defaultAttributes,
                    fieldOptions: fieldDefinition,
                    fromModel: modelName,
                    relatedTo: fieldDefinition.relatedTo
                })
                return null
            default:
                return defaultAttributes
        }
    }
    
    /**
     * Translates model options to some options that sequelize can understand, we disable timestamps by default
     * because it doesn't anything new for us. 
     * 
     * As you've read on models/index/Model we define the default ordering like django models, instead of defining
     * as `ASC` or `DESC` you define them as -<fieldName> for decending ordering and <fieldName> for ascending ordering.
     * 
     * For indexes we define them differently, mostly inside of the attributes directly but we can also define them in the options directly
     * 
     * @param {String} modelName - The name of the model you are working with, this is nothing more than the class name of the model.
     * @param {Object} modelOptions - These are modelOptions that has their structure defined inside the Model class in config/database/index.js
     * 
     * @returns {Object} - Returns the translated model object that we will use to build the actual model inside of the engine.
     */
    #translateModelOptions(modelName, modelOptions) {
        return {
            underscored: modelOptions.underscored,
            indexes: this.#indexes[modelName] ? this.#indexes[modelName] : [],
            timestamps: false,
            tableName: modelOptions.tableName === null ? modelName : modelOptions.tableName,
            ...modelOptions.customOptions
        }
    }

    /**
     * Translates the default ordering of a particular model, we define the ordering as -'fieldName' for decending ordering
     * and 'fieldName' for ascending ordering.
     * // Reference: https://github.com/sequelize/sequelize/issues/9289#issuecomment-382566071
     * // reference: https://stackoverflow.com/questions/54117521/is-it-possible-to-define-a-default-sort-order-for-a-sequelize-model
     * 
     * @param {string} modelName - The name of the model to define the ordering to
     * @param {object} modelOptions - The options attribute from your model.
     */
    #translateOrdering(modelName, modelOptions) {
        let translatedOrdering = []
        modelOptions.ordering.forEach(order => {
            if (order.charAt(0) === '-') {
                translatedOrdering.push([order.substring(1), 'DESC'])
            } else {
                translatedOrdering.push([order, 'ASC'])
            }
        })

        if (translatedOrdering.length > 0) {
            this.definedModels[modelName].addScope('defaultScope', {
                order: translatedOrdering
            }, { override: true })
        }
    }


    /**
     * While you are translating the fields and evaluating the models, when a related field is found we do not consider this field and instead
     * push a object to a list so we can evaluate this relation later. This is because relations sometimes can have circular imports and we want to enable
     * the user to add strings to the related models, this way we prevent circular imports and can keep it flat and easy to work with.
     * 
     */
    #evaluateRelatedFields() {
        const definedModelNames = Object.keys(this.definedModels)
        let filteredRelatedFieldsToEvaluate = []
        let filteredRelatedFieldsNotReadyToEvaluate = []
        for (let i=0; i<this.#relatedFieldsToEvaluate.length; i++) {
            const relationToEvaluate = this.#relatedFieldsToEvaluate[i]
            if (relationToEvaluate.relatedTo === undefined) throw new Error(`The 'relatedTo' parameter is obligatory in relations. You forgot to define it in '${relationToEvaluate.fromModel}' model on the` +
                ` '${relationToEvaluate.fieldName}' column.`)
            const relatedToModelName = typeof(relationToEvaluate.relatedTo) === 'string' ? relationToEvaluate.relatedTo : relationToEvaluate.relatedTo.name
            
            if (definedModelNames.includes(relatedToModelName)){
                filteredRelatedFieldsToEvaluate.push(relationToEvaluate)
            } else {
                filteredRelatedFieldsNotReadyToEvaluate.push(relationToEvaluate)
            }
        }
        this.#relatedFieldsToEvaluate = filteredRelatedFieldsNotReadyToEvaluate

        filteredRelatedFieldsToEvaluate.forEach(relationToEvaluateAfter => {
            const relatedToModelName = typeof(relationToEvaluateAfter.relatedTo) === 'string' ? relationToEvaluateAfter.relatedTo : relationToEvaluateAfter.relatedTo.name
            const relatedTo = 'RelatedTo'

            const options = {
                foreignKey: relationToEvaluateAfter.foreignKeyOptions,
                hooks: true,
                onDelete: this.#translateOnDeleteOperations(relationToEvaluateAfter.fieldOptions.onDelete)
            }

            const modelNameWithFirstStringAsLowerCase = relationToEvaluateAfter.fromModel.charAt(0).toLowerCase() + relationToEvaluateAfter.fromModel.slice(1)
            const fieldNameWithFirstStringAsUpperCase = relationToEvaluateAfter.fieldName.charAt(0).toUpperCase() + relationToEvaluateAfter.fieldName.slice(1)
            const relatedName = relationToEvaluateAfter.relatedName ? 
                relationToEvaluateAfter.relatedName : 
                modelNameWithFirstStringAsLowerCase + relatedTo + fieldNameWithFirstStringAsUpperCase
            
            if (this.definedModels[relationToEvaluateAfter.fromModel] && this.definedModels[relatedToModelName]) {
                switch (relationToEvaluateAfter.relationType) {
                    case (models.fields.ForeignKeyField.name):
                        options.as = relatedName
                        this.definedModels[relatedToModelName].hasMany(
                            this.definedModels[relationToEvaluateAfter.fromModel],
                            options
                        )
                        
                        options.as = relationToEvaluateAfter.fieldName
                        this.definedModels[relationToEvaluateAfter.fromModel].belongsTo(
                            this.definedModels[relatedToModelName],
                            options
                        )
                        
                        break
                    case (models.fields.OneToOneField.name):
                        options.as = relatedName
                        this.definedModels[relatedToModelName].hasOne(
                            this.definedModels[relationToEvaluateAfter.fromModel], 
                            options
                        )
        
                        options.as = relationToEvaluateAfter.fieldName
                        this.definedModels[relationToEvaluateAfter.fromModel].belongsTo(
                            this.definedModels[relatedToModelName],
                            options
                        )
                        break
                }
            }
        })
    }

    /**
     * Returns a model in the ORM, this can be a TypeORM entity, or a Sequelize Model, it doesn't matter, here it is a Sequelize model.
     * 
     * @param {Object} modelAttributes - An object with the attributes, check models for example on how you define models for further understanding.
     * But to make it quick, models are classes that are defined with 4 possible attributes: 
     * `attributes` which will be like:
     * >>> attributes = {
     *      name: new models.fields.CharField({allowNull: true, maxLength:200}),
     *      password: new models.fields.CharField({maxLength:200})
     * }
     * 
     * The options, which will be like:
     * >>> options = {
     *      tableName: 'type_of_event'
     * }
     * 
     * The managers and the instance methods are defined better in models but in simple terms
     * Managers are classes that you can group your queries and instance methods are operations
     * you do on a single instance
     * 
     * @param {string} modelName - The modelName is the class name of the model, if you define your model as
     * class User extends models.Model {} your modelName will be `User`, nothing much to say.
     * @param {object} modelAttributes - We explain how the attributes are defined up here in the method documentation
     * but if you have any other doubt you should check the models documentation.
     * @param {object} modelOptions - These are modelOptions that has their structure defined inside the Model class in config/database/index.js
     * @param {Array<Function>} instanceMethods - These are the methods that you should attach to the instance created by the engine.
     * If the engine does not support attaching methods to an instance you should notify the user.
     * 
     * @returns {object | null} - Returns null if it was an abstract model and the defined sequelize model. This is the reference of the object that
     * is returned here: https://sequelize.org/master/class/lib/model.js~Model.html
     */
    defineModel(modelName, modelAttributes, modelOptions, instanceMethods=[]) {
        const translatedOptions = this.#translateModelOptions(modelName, modelOptions)
        const translatedFields = this.#translateFields(modelName, modelAttributes, modelOptions)

        if (modelOptions.abstract === false) {
            const model = this.engineInstance.define(modelName, translatedFields, {...translatedOptions, indexes: this.#indexes[modelName] ? this.#indexes[modelName] : []})
            this.definedModels[modelName] = model
            this.#evaluateRelatedFields()
            
            // because of `resetModels()` we might loose the reference to the hooks of the model, this will keep the hook intact
            // so we can update the data accordingly
            function updateDate(modelHooks) {
                return (instance) => {
                    for (const updateDateHook of modelHooks) {
                        instance[updateDateHook.fieldName] = new Date()
                    }
                }
            }

            if (this.#addHooksToUpdateDate[modelName] !== undefined) {
                this.definedModels[modelName].beforeSave(updateDate(this.#addHooksToUpdateDate[modelName]))
            }

            for (const instanceMethod of instanceMethods) {
                const instanceMethodName = Object.keys(instanceMethod)[0]
                model.prototype[instanceMethodName] = instanceMethod[instanceMethodName]
            }

            this.#translateOrdering(modelName, modelOptions)

            return model
        } else {
            return null
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
     * - Create decorators so we can decorate functions and classes with it (needs babel with proposal decorators defined), but i think it's not ideal since it'll be 
     * compilation dependant.
     * 
     * @param {Function} callback 
     * @param  {...any} rest 
     */
    async transaction(callback, ...rest) {
        await this.engineInstance.transaction(async transact=> {
            await callback(...rest, transact)
        })
    }

    /**
     * This is based on the lifecycle of migrations, first we initialize the migration creating a query interface and a transaction.
     */
    async initializeMigrations() {
        this.#queryInterface = this.engineInstance.getQueryInterface()
    }

    /**
     * When the model references itself we need to evaluate it lazily. What this does is: First check if it has a circular dependency,
     * all circular dependencies will add a new column.
     * 
     * For example:
     * ```
     * class CircularDependency extends models.Model {
     *      attributes = {
     *          circular: new models.fields.ForeignKeyField({
     *              relatedTo:'Circular',
     *              onDelete: models.fields.ON_DELETE.CASCADE
     *          })
     *      }
     *      options = {
     *          tableName: 'circular_dependency',
     *      }
     * }
     * 
     * class Circular extends models.Model {
     *      attributes = {
     *          circularFromHere: new models.fields.ForeignKeyField({
     *          relatedTo:'CircularDependency',
     *          onDelete: models.fields.ON_DELETE.CASCADE
     *      })
     * }
     *     options = {
     *          tableName: 'circular',
     *      }
     * }
     * ```
     * 
     * Look that CircularDependency is dependant on Circular and Circular is dependant on CircularDependency.
     * 
     * So what this does is that, on the creation of `Circular` or `CircularDependency` one of the columns will not yet be created.
     * So it won't create the column by default, you can remove this function, and create this simple model, make a migration and then
     * run this, you will see that `circular` table will be created but WILL NOT contain the `circularFromHere` column.
     * 
     * So what we do is handle this and enforce it's creation.
     * 
     * For doing that we will transverse the attributes defined in the model and we check if the 'relatedTo' attribute is already defined or not.
     * If it's not then we will append it to .circularDependenciesInMigration variable. The next time we run this function on the next operation we
     * enter on this function again, and then we will check if the model that is pending has been created or not. If it is then we will create the column.
     * Really simple stuff.
     * 
     * @param {object} transaction - The transaction where all of the migrations are running.
     * 
     * @param {object} params - The params that are passed to the function.
     * @param {{initialized: Model, original: import('../models').Model}} params.fromModel - The state of the model before.
     * @param {{initialized: Model, original: import('../models').Model}} params.toModel -The state of the model in this current migration.
     */
    async handleCircularDependenciesMigration(transaction, {fromModel, toModel}) {
        for (const {fromModel, toModel, attributeName, relatedToName} of this.circularDependenciesInMigration) {
            // Guarantee that the column certainly does not exist yet in the model so we can enforce it's creation.
            if (toModel.initialized.rawAttributes[attributeName] === undefined && this.definedModels[relatedToName] !== undefined) {
                toModel.initialized = this.engineInstance.model(toModel.initialized.name)
                await this.addColumnMigration(transaction, toModel, fromModel, attributeName)
            }
        }

        for (const fieldDefinition of Object.values(toModel.original.attributes)) {
            if (fieldDefinition instanceof models.fields.ForeignKeyField) {
                if (this.definedModels[fieldDefinition.relatedTo] === undefined) {
                    this.circularDependenciesInMigration.push({
                        fromModel: fromModel !== undefined ? fromModel : toModel,
                        toModel: toModel,
                        attributeName: fieldDefinition.fieldName,
                        relatedToName: fieldDefinition.relatedTo
                    })
                }
            }
        }
    }

    /**
     * Responsible for adding the indexes in the migration, it is not called directly from every action
     * but instead this is handled by sequelizeEngine itself.
     * 
     * This creates all of the indexes in all of the tables so you do not miss any index.
     */
    async handleIndexesMigration(transaction, {fromModel, toModel}) {
        let failedIndexesForNextIteration = []
        this.#indexesToAddOnNextIteration = []

        let fromModelIndexes = []
        if (fromModel) {
            fromModelIndexes = fromModel.initialized._indexes
        }
        const toModelIndexes = toModel.initialized._indexes

        const toModelDatabaseColumnNames = Object.keys(toModel.initialized.rawAttributes).map(attributeName => toModel.initialized.rawAttributes[attributeName].field)
        for (const toModelIndex of toModelIndexes) {
            const stringfyiedToModelIndex = JSON.stringify(toModelIndex)
            const hasFound = fromModelIndexes.find(fromModelIndex => JSON.stringify(fromModelIndex) === stringfyiedToModelIndex)
            if (hasFound === undefined) {
                if (toModelIndex.fields.every(indexColumnName => toModelDatabaseColumnNames.includes(indexColumnName))) {
                    try {
                        await this.#queryInterface.addIndex(
                            toModel.initialized.options.tableName,
                            Object.assign({transaction: transaction}, toModelIndex),
                        ) 
                    } catch(e) {
                        throw e
                    }
                } else {
                    failedIndexesForNextIteration.push({
                        tableName: toModel.initialized.options.tableName,
                        index: toModelIndex
                    })
                }
            }
        }

        for (const fromModelIndex of fromModelIndexes) {
            const stringfyiedFromModelIndex = JSON.stringify(fromModelIndex)
            const hasFound = toModelIndexes.find(toModelIndex => JSON.stringify(toModelIndex) === stringfyiedFromModelIndex)
            if (hasFound === undefined) {
                await this.#queryInterface.removeIndex(
                    toModel.initialized.options.tableName,
                    fromModelIndex.name,
                    {transaction: transaction}
                )
            }
        }

        for (const toTryToAddOnThisIteration of this.#indexesToAddOnNextIteration) {
            try {
                await this.#queryInterface.addIndex(
                    toTryToAddOnThisIteration.tableName,
                    Object.assign({transaction: transaction}, toTryToAddOnThisIteration.index),
                )
            } catch (e) {
                failedIndexesForNextIteration.push(toTryToAddOnThisIteration)
            }
        }
        this.#indexesToAddOnNextIteration = failedIndexesForNextIteration
    }


    /**
     * Responsible for creating a new column inside of a running migration.
     * 
     * @param {String} attributeName - The name of the attribute defined
     * @param {Object} model - The model object, this model object has `initialized` and `original` keys, the first is the actual engine
     * model, the second is the model it originates from. IMPORTANT, THIS MODEL IS FROM THE STATE, SO THE WAY IT IS WHILE THE MIGRATION IS RUNNING
     * IT IS NOT THE MODEL FROM THE LAST STATE (THE WAY IT IS RIGHT NOW)
     */
    async addColumnMigration(transaction, toModel, fromModel, attributeName) {
        let sequelizeAttribute = toModel.initialized.rawAttributes[attributeName]
        // ForeignKeyFields and OneToOneFields have the `Id` suffix at the end of them.
        // Here we do not need to know that, so what we do is retrieve the original name of the field with it's suffix from the original model.
        if (sequelizeAttribute === undefined) {
            attributeName = toModel.original.attributes[attributeName]?.fieldName
            sequelizeAttribute = toModel.initialized.rawAttributes[attributeName]
        }
        await this.#queryInterface.addColumn(
            toModel.initialized.options.tableName, 
            sequelizeAttribute.field, 
            sequelizeAttribute, 
            {transaction: transaction}
        )
        await this.handleCircularDependenciesMigration(transaction, {fromModel, toModel})
        await this.handleIndexesMigration(transaction, {fromModel, toModel})
    }

    /**
     * Responsible for changing the fields of the model. This does many stuff, from creating indexes, to removing constraints and so on.
     * The idea is that this renames the table, this adds indexes, this changes the model attribute definition and so on. For that to work
     * we need many data.
     * 
     * @param {Object} toModel - This object will hold the model initialized by the engine and the original model. 
     * This is the model of the state IN the migration
     * @param {Object} fromModel - This object will hold the model initialized by the engine and the original model. 
     * This is the model of the state BEFORE the migration
     * @param {Object} attributeDefinitionBefore - The attribute definition defined before the change.
     * @param {Object} attributeDefinitionAfter - The attribute definition after the change
     */
    async changeColumnMigration(transaction, toModel, fromModel, attributeDefinitionBefore, attributeDefinitionAfter) {
        let initializedAttribute = null
        for (const attributeDefinition of [...Object.values(toModel.initialized.rawAttributes)]) {
            if (attributeDefinition.field === attributeDefinitionAfter.databaseName) {
                initializedAttribute = attributeDefinition
                break
            }
        }

        // This removes the constraint, when we change the column sequelize automatically creates a new constraint
        // because of that we remove the old one.
        if ([models.fields.ForeignKeyField.name, models.fields.OneToOneField.name].includes(attributeDefinitionBefore.constructor.name)) {
            const constraints = await this.#queryInterface.getForeignKeyReferencesForTable(toModel.initialized.options.tableName, {transaction: transaction})
            const constraintsToRemove = constraints.filter(constraint => constraint.columnName === attributeDefinitionBefore.databaseName)
            for (const constraintToRemove of constraintsToRemove) {
                await this.#queryInterface.removeConstraint(toModel.initialized.options.tableName, constraintToRemove.constraintName, {transaction: transaction})
            }
        }

        await this.#queryInterface.changeColumn(toModel.initialized.options.tableName, attributeDefinitionAfter.databaseName, initializedAttribute, {transaction: transaction})
        await this.handleCircularDependenciesMigration(transaction, {fromModel, toModel})
        await this.handleIndexesMigration(transaction, {toModel, fromModel})
    }

    /**
     * Renames the column name.
     * 
      * @param {Object} toModel - This object will hold the model initialized by the engine and the original model. 
     * This is the model of the state IN the migration
     * @param {Object} fromModel - This object will hold the model initialized by the engine and the original model. 
     * This is the model of the state BEFORE the migration
     * @param {String} attributeNameBefore - How the column name was, this is not the actual field name but the attribute name.
     * @param {String} attributeNameAfter - The new name of the column, this is not the actual field name but the attribute name.
     */
    async renameColumnMigration(transaction, toModel, fromModel, attributeNameBefore, attributeNameAfter) {
        const databaseNameAfter = toModel.original.attributes[attributeNameAfter]?.databaseName ? 
            toModel.original.attributes[attributeNameAfter].databaseName :
            toModel.initialized.rawAttributes[attributeNameAfter].field

        const databaseNameBefore = fromModel.original.attributes[attributeNameBefore]?.databaseName ? 
            fromModel.original.attributes[attributeNameBefore].databaseName :
            fromModel.initialized.rawAttributes[attributeNameBefore].field
        
        await this.#queryInterface.renameColumn(
            toModel.initialized.options.tableName, 
            databaseNameBefore, 
            databaseNameAfter,
            {transaction: transaction}
        )
        await this.handleCircularDependenciesMigration(transaction, {fromModel, toModel})
        await this.handleIndexesMigration(transaction, {toModel, fromModel})
    }
    /**
     * Removes a column from a model from the database in a running migration. 
     * 
     * @param {{initialized: import('sequelize').Model, original: import('../models').Model}} toModel - This object will hold the model initialized 
     * by the engine and the original model. This is the model of the state IN the migration.
     * @param {{initialized: import('sequelize').Model, original: import('../models').Model}} fromModel - This object will hold the model initialized
     * by the engine and the original model. This is the model of how it was before.
     * @param {string} attributeName - The name of the removed attribute name.
     */
    async removeColumnMigration(transaction, toModel, fromModel, attributeName) {
        const columnName = fromModel.original.attributes[attributeName].databaseName
        await this.#queryInterface.removeColumn(fromModel.initialized.options.tableName, columnName, {transaction: transaction})
        await this.handleIndexesMigration(transaction, {toModel, fromModel})
    }

    /**
     * Responsible for creating a new model inside of a running migration.
     * 
     * @param {Object} model - The model object, this model object has `initialized` and `original` keys, the first is the actual engine
     * model, the second is the model it originates from. IMPORTANT, THIS MODEL IS FROM THE STATE, SO THE WAY IT IS WHILE THE MIGRATION IS RUNNING
     * IT IS NOT THE MODEL FROM THE LAST STATE (THE WAY IT IS RIGHT NOW)
     */
    async addModelMigration(transaction, toModel, fromModel) {
        const model = toModel.initialized
        await this.#queryInterface.createTable(model.options.tableName, model.rawAttributes, Object.assign(model.options, {transaction: transaction}))
        await this.handleCircularDependenciesMigration(transaction, {toModel})
        await this.handleIndexesMigration(transaction, {toModel})
    }
    
    /**
     * Changes the model options. Here we only change the table name, but other actions might be supported like creating custom
     * indexes and so on. For now it's really simple.
     * 
     * @param {String} modelName - The name of the model.
     */
    async changeModelMigration(transaction, toModel, fromModel, modelName) {
        const fromTableName = fromModel.initialized.tableName
        const toTableName = toModel.initialized.tableName

        if (toTableName !== fromTableName) {
            await this.#queryInterface.renameTable(
                fromTableName, 
                toTableName, 
                {transaction: transaction})
        }
        await this.handleCircularDependenciesMigration(transaction, {fromModel, toModel})
        await this.handleIndexesMigration(transaction, {toModel, fromModel})
    }

    /**
     * Removes a model/table from from the database in a running migration.
     * 
     * @param {Object} toModel - This object will hold the model initialized by the engine and the original model. 
     * This is the model of the state IN the migration.
     */
    async removeModelMigration(transaction, fromModel) {
        await this.#queryInterface.dropTable(fromModel.initialized.options.tableName, {transaction: transaction})
    }

    /**
     * Recieves an object, if this object is a model, return the data otherwise return the data untouched. This is used for serializing.
     * 
     * @param {Any} data - Verify if the object recieved is an instance of model otherwise return data
     * 
     * @returns {Any} - Convert to an object if it is an model otherwise return untouched.
     */
    convertData(data) {
        if (data instanceof Model) {
            return data.dataValues
        } else {
            return data
        }
    }
}

module.exports = SequelizeEngine
