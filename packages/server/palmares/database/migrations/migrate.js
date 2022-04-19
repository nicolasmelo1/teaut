const { retrieveMigrations, initializedStateModelsByModelName } = require('../helpers')
const { initialize } = require('../index')
const { reorderMigrations } = require('./order')
const { ReflowMigrations } = require('./migrations')
const actions = require('./actions')
const logger = require('../../logging')
const models = require('../models')
const getState = require('./state')

/**
 * When we run a migration we need to save in the database that we have run this migration, so this is for creating the table 
 * of the runned migrations, and otherwise create the table in a migration.
 * 
 * @param {Engine} engineInstance - A Engine class instance object.
 * @param {object} internalModelsByModelName - An object of internal models by model name, right now the only internal model is ReflowMigration
 * but there can be others
 * 
 * @returns {String} - Returns an empty string or the actual last migration name.
 */
const createReflowMigrationsTableAndGetLastMigrationName = async (engineInstance, internalModelsByModelName) => {
    await engineInstance.initializeMigrations()
    const createReflowMigrationsTable = async (transaction) => {
        const action = new actions.CreateModel(
            reflowMigrationsInstance.constructor.name, 
            ReflowMigrations.attributes,
            ReflowMigrations.options
        )
        await action.run(transaction, engineInstance, internalModelsByModelName, internalModelsByModelName)
    }
    
    let lastMigrationName = ''
    // create table that will store migrations if it does not exist
    const reflowMigrationsInstance = new ReflowMigrations()

    try {
        lastMigrationName = await ReflowMigrations.migration.getLastRunMigrationNameOrderedById()
    } catch (e) {
        console.log(e)
        await engineInstance.transaction(createReflowMigrationsTable)
    }
    return lastMigrationName
}

/**
 * Run the migration file inside of a transaction, sends the transaction to every `.run()` action
 * operation. With this we can make each action run easily inside of a single transaction without any
 * further development.
 * 
 * @param {object} migration - You can find the structure in the ../helpers.js file in the `retrieveMigrations`
 * function. Structure:
 * {
 *     appName: {String},
 *     migrationName: {String},
 *     migration: {
 *         engine: {String}
 *         dependency: {String}
 *         operations: function(models, actions) {}
 *     }
 * }
 * @param {object} transaction - The transaction object retrieved by the engine.
 */
const runMigrationFile = async (toEngineInstance, fromEngineInstance, settings, migration, transaction) => {

    logger.INFO.RUNNING_MIGRATION(migration.migrationName)

    let actionIndex = 0
    for (const action of migration.migration.operations(models, actions)) {
        const fromState = getState(settings, migration.migrationName, actionIndex, null)
        const fromStateModelsByModelName = initializedStateModelsByModelName(fromState, fromEngineInstance)
        const toState = getState(settings, migration.migrationName, null, actionIndex)
        const toStateModelsByModelName = initializedStateModelsByModelName(toState, toEngineInstance)
        await action.run(transaction, toEngineInstance, fromStateModelsByModelName, toStateModelsByModelName)
        actionIndex++
    }

    await ReflowMigrations.instance.create({
        app: migration.appName, 
        migrationName: migration.migrationName
    })
}

/**
 * How does migrations work? Easy
 * 
 * We have 2 commands, makemigrations and migrate, to make automatic migrations we need to save
 * the state of the models and then compare to the current state. But you might ask yourself: how the hell do we
 * save the state of the models before they were changed and i have the response: the actual migrations
 * 
 * I've got this idea from django migrations itself that works flawlessly. By running each action in order we can recreate the state of the models and
 * then compare to how it is right now. So we can know what was created, what was renamed and such.
 * 
 * For that to work we CAN'T use the actual actions sequelize gives us, instead we should create our own actions because that would be easier
 * This is because each action will hold what will happen to rebuild the state, also each action will hold the data needed to rebuild the state and to 
 * discard the changes and go backwards.
 * 
 * That's basically the hole idea of the automatic migrations, and then to run the migrations it's easy we have the actions just need to run each of them.
 * Also be aware that we create the `reflow_migrations` table to store the last runned migrations, this way it is a lot easier for us to work.
 * 
 * This was done so it's easier and less of a pain to work with an ORM within this project. An ORM was needed because it keeps the database underneath the SQL, and 
 * work with raw sql can be a problem since we need to be aware of many underlying that can break the production app and also other security issues like SQL injection.
 * 
 * @param {object} settings - The settings file that will live in '.src/settings.js'
 */
const migrate = async (settings) => {
    const { engineInstance: toEngineInstance, internalModels } = initialize(settings, [ReflowMigrations])
    const { engineInstance: fromEngineInstance } = initialize(settings, [ReflowMigrations])

    const internalModelsByModelName = {}
    
    internalModels.forEach(data => {
        internalModelsByModelName[data.original.constructor.name] = data
    })
    let migrations = retrieveMigrations(settings)
    migrations = reorderMigrations(migrations)
    const lastMigrationName = await createReflowMigrationsTableAndGetLastMigrationName(toEngineInstance, internalModelsByModelName)

    
    // We just filter the migrations that was not run yet this way we will just run the new migrations
    const lastMigrationIndex = migrations.findIndex(migration => migration.migrationName === lastMigrationName)
    if (lastMigrationIndex !== -1) {
        migrations = migrations.filter((_, index) => index > lastMigrationIndex )
    }

    for (const migration of migrations) {
        await toEngineInstance.initializeMigrations()
        await toEngineInstance.transaction(runMigrationFile, toEngineInstance, fromEngineInstance, settings, migration)
    }

    logger.INFO.FINISHED_MIGRATION()
    process.exit()
}


module.exports = migrate