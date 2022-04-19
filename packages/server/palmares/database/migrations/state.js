const { retrieveMigrations } = require('../helpers')
const { reorderMigrations } = require('./order')
const actions = require('./actions')
const models = require('../models')

/**
 * Responsible for recreating the models state so we can use it for comparing with the 
 * current state for the migrations
 * 
 * @returns {object} - The State functions that can run inside of each action to build the hole state.
 */
const ProjectState = () => {
    let models = {}

    const addModel = (appName, modelName, attributes, options={}) => {
        models[modelName] = {
            appName: appName,
            attributes: attributes,
            options: options
        }
    }

    const deleteModel = (modelName) => {
        delete models[modelName]
    }

    const changeModel = (appName, modelName, oldOptions, newOptions) => {
        models[modelName].appName = appName
        models[modelName].options = newOptions
    }

    const renameModel = (appName, modelName, newModelName) => {
        models[modelName].appName = appName
        models[newModelName] = models[modelName]
        delete models[modelName]
    }

    const addColumn = (appName, modelName, columnName, options) => {
        models[modelName].appName = appName
        models[modelName].attributes[columnName] = options
    } 

    const renameColumn = (appName, modelName, attributeNameBefore, attributeNameAfter, columnOptions) => {
        models[modelName].appName = appName

        if (attributeNameAfter !== attributeNameBefore) {
            models[modelName].attributes[attributeNameAfter] = models[modelName].attributes[attributeNameBefore]
            delete models[modelName].attributes[attributeNameBefore]
        }
        models[modelName].attributes[attributeNameAfter] = columnOptions
    }
    
    const changeColumn = (appName, modelName, columnName, options) => {
        models[modelName].appName = appName
        models[modelName].attributes[columnName] = options
    }

    const deleteColumn = (appName, modelName, columnName) => {
        models[modelName].appName = appName
        delete models[modelName].attributes[columnName]
    }


    return {
        models,
        addModel,
        deleteModel,
        changeModel,
        renameModel,
        addColumn,
        renameColumn,
        changeColumn,
        deleteColumn
    }
}

/**
 * Retrieve the state from the migrations.
 * 
 * This way we can recreate the hole state without any connection to the database
 * The idea for creating this was retrieved from the Django itself. 
 * 
 * This will make it way easier to make diffs in migrations and the original state itself.
 * 
 * @param {Object} settings - The settings object from the settings file so we have access to the installed apps and all that stuff
 */
const getState = (settings, untilMigration=null, fromMigrationIndex=null, toMigrationIndex=null) => {
    const projectState = ProjectState()
    let migrations = retrieveMigrations(settings)
    migrations = reorderMigrations(migrations)
    if (untilMigration !== null) {
        const filteredMigrations = []
        for (const migration of migrations) {
            if (migration.migrationName === untilMigration) {
                filteredMigrations.push(migration)
                break
            } else {
                filteredMigrations.push(migration)
            }
        }
        migrations = filteredMigrations
    }

    for (let i=0; i<migrations.length; i++) {
        const operations = migrations[i].migration.operations(models, actions)
        let operationIndex = 0
        for (const operation of operations) {
            if (untilMigration === migrations[i].migrationName && fromMigrationIndex === operationIndex) break
            operation.stateForwards(migrations[i].appName, projectState)
            if (untilMigration === migrations[i].migrationName && toMigrationIndex === operationIndex) break  
            operationIndex++
        }
    }
    return projectState.models
}

module.exports = getState