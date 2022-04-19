/**
 * @module config/database/migrations/makemigrations/generate
 */

const fs = require('fs')
const path = require('path')
const dedent = require('../../../utils/dedent')
const { retrieveMigrations } = require('../../helpers')
const { reorderMigrations } = require('../order')
const logger = require('../../../logging')
const models = require('../../models')

/**
 * Used for cleaning attributes, attributes are class instances, but we need to convert them to
 * a string, this is exactly what this does. We convert the classes to a string and also it's options.
 * This uses `cleanAttribute` because this is supposed to clean an object of many attributes.
 * 
 * @param {Object} attributes - This is a object where each key is a attribute name, and each value is an instance of
 * models.fields 
 * @param {BigInt} ident - The indent value, how much you should ident the code.
 * 
 * @returns {String} - Returns the attributes object but stringfied.
 */
const cleanAttributes = (attributes, ident=5) => {
    const initialIdent = ident-2 > 0 ? ident-2 : 0
    let attributesString = `${'\t'.repeat(initialIdent)}{ \n`
    Object.keys(attributes).forEach(attributeName => {
        let attributeString = `${'\t'.repeat(ident)}\t${attributeName}:`
        attributeString = attributeString + cleanAttribute(attributes[attributeName], ident+1)
        attributesString = attributesString + attributeString + ',\n'
    })
    return attributesString + ` ${'\t'.repeat(ident)}}`
}

/**
 * Clean an attribute to generate the string for the actual value.
 * 
 * @param {object} attributeObject - A '../database/models/fields.js' object.
 * 
 * @returns {string} - Returns the stringified attribute to be used in the generated migration.
 */
const cleanAttribute = (attributeObject) => {
    return `new models.fields.${attributeObject.constructor.name}(${JSON.stringify(attributeObject)})`
}

/**
 * Cleans the options of the model.
 * 
 * @param {object} optionsObject - The `options` object of the model definition, read `../../database/models/index.js`
 * for reference.
 * @param {BigInt} ident - The indent value, how much you should ident the code.
 * 
 * @returns {BigInt} - Returns the options object but stringfied.
 */
const cleanOptions = (optionsObject, ident=5) => {
    const tabs = '\t'.repeat(ident)
    let stringfiedOptions = `{\n`
    Object.keys(optionsObject).forEach(optionsKey => {
        if (optionsObject[optionsKey] instanceof models.fields.Field) {
            stringfiedOptions = stringfiedOptions + `${tabs}${optionsKey}: new models.fields.${optionsObject[optionsKey].constructor.name}(${JSON.stringify(optionsObject[optionsKey])}),\n`
        } else {
            stringfiedOptions = stringfiedOptions + `${tabs}${optionsKey}: ${JSON.stringify(optionsObject[optionsKey])},\n`
        }
    })
    stringfiedOptions = stringfiedOptions + `${'\t'.repeat(ident-1)}}`
    return stringfiedOptions
}

const getCreateModelForFile = (data) => {
    const action = `\t\t\tnew actions.CreateModel(
        \t\t${JSON.stringify(data.modelName)},
        ${cleanAttributes(data.data.attributes, 4)},
        \t\t${cleanOptions(data.data.options)}
    \t\t)`
    return action
}


const getRenameModelForFile = (data) => {
    const action = `\t\t\tnew actions.RenameModel(
        \t\t${JSON.stringify(data.data.modelNameBefore)},
        \t\t${JSON.stringify(data.data.modelNameAfter)}
    \t\t)`

    return action
}
const getChangeModelForFile = (data) => {
    const action = `\t\t\tnew actions.ChangeModel(
        \t\t${JSON.stringify(data.modelName)},
        \t\t${cleanOptions(data.data.optionsBefore)},
        \t\t${cleanOptions(data.data.optionsAfter)}
    \t\t)`

    return action
}

const getDeleteTableForFile = (data) => {
    const action = `\t\t\tnew actions.DeleteModel(
        \t\t${JSON.stringify(data.modelName)}
    \t\t)`
    
    return action
}

const getCreateColumnForFile = (data) => {
    const action = `\t\t\tnew actions.CreateColumn(
        \t\t${JSON.stringify(data.modelName)},
        \t\t${JSON.stringify(data.data.attributeName)},
        \t\t${cleanAttribute(data.data.attributeDefinition)}
    \t\t)`

    return action
}

const getChangeColumnForFile = (data) => {
    const action = `\t\t\tnew actions.ChangeColumn(
        \t\t${JSON.stringify(data.modelName)},
        \t\t${JSON.stringify(data.data.attributeName)},
        \t\t${cleanAttribute(data.data.attributeDefinitionBefore)},
        \t\t${cleanAttribute(data.data.attributeDefinitionAfter)}
    \t\t)`

    return action
}

const getRenameColumnForFile = (data) => {
    const action = `\t\t\tnew actions.RenameColumn(
        \t\t${JSON.stringify(data.modelName)},
        \t\t${JSON.stringify(data.data.attributeNameAfter)},
        \t\t${JSON.stringify(data.data.attributeNameBefore)},
        \t\t${cleanAttribute(data.data.attributeDefinition)}
    \t\t)`

    return action
}

const getRemoveColumnForFile = (data) => {
    const action = `\t\t\tnew actions.RemoveColumn(
        \t\t${JSON.stringify(data.modelName)},
        \t\t${JSON.stringify(data.data.attributeName)}
    \t\t)`

    return action
}

/**
 * This will create a string for each action, in other words, this is just a big switch with all of the actions the 
 * migration can perform.
 * 
 * @param {Array<object>} differencesList - Check the './operations.js' for reference on how each object on this array 
 * will be structured.
 * 
 * @returns {string} - Returns the actual stringfied actions to use in the migrations. We will use generally the classes
 * generated in '../actions.js' on each file.
 */
const getActionsInString = (differencesList) => {
    let actions = ''
    for (let i=0; i<differencesList.length; i++) {
        switch (differencesList[i].action) {
            case 'createModel':
                actions = actions + getCreateModelForFile(differencesList[i]) + ',\n'
                break
            case 'changeModel':
                actions = actions + getChangeModelForFile(differencesList[i]) + ',\n'
                break
            case 'renameModel':
                actions = actions + getRenameModelForFile(differencesList[i]) + ',\n'
                break
            case 'createColumn':
                actions = actions + getCreateColumnForFile(differencesList[i]) + ',\n'
                break
            case 'changeColumn':
                actions = actions + getChangeColumnForFile(differencesList[i]) + ',\n'
                break
            case 'renameColumn':
                actions = actions + getRenameColumnForFile(differencesList[i]) + ',\n'
                break
            case 'removeColumn':
                actions = actions + getRemoveColumnForFile(differencesList[i]) + ',\n'
                break
            case 'deleteTable':
                actions = actions + getDeleteTableForFile(differencesList[i]) + ',\n'
        }
    }
    if (actions !== '') {
        actions = actions.slice(0, -1)
    }
    return actions
}

/**
 * Generate all of the files based on the differences list. The differences list will be a list of
 * objects, to understand the structure of this object you should check './operations.js' file. This is
 * the structure of the differences.
 * 
 * @param {String} engineName - The name of the engine that is currently being used to generate the migrations
 * this does not have any use right now but will have more use in the near future.
 * @param {Object} settings - The settings.js file object.
 * @param {Array<Object>} differencesList - A list of differences to pass to each of them and generate the file
 * with all of the actions.
 */
async function generateFiles (engineName, settings, differencesList) {
    /**
     * Effectively generate the files for the migrations, super simple.
     * 
     * @param {string} appName - The app name where this file should be generated.
     * @param {Array<object>} differencesListToConsider - The actions that will be held on this migrations file.
     * @param {string} lastGeneratedMigrationFileName - The name of the last migration, this way we can safely append the
     * dependencies on each new migration files to keep the migrations in order.
     * 
     * @returns {string} - The name of the generated migration file.
     */
    const generateFile = (appName, differencesListToConsider, lastGeneratedMigrationFileName='') => {
        const currentDate = new Date()
        const file = dedent`
        /**
        * Automatically Generated by Palmares at ${currentDate.toISOString()}
        * */

        'use strict'

        module.exports = {
            engine: "${engineName}",
            dependency: ${JSON.stringify(lastGeneratedMigrationFileName)},
            operations: (models, actions) => {
                return [
        ${getActionsInString(differencesListToConsider)}
                ]
            }
        }
        ` 
        let lastNumber = lastGeneratedMigrationFileName.match(/(^\d+)/)
        if (lastNumber && lastNumber.length > 0) {
            lastNumber = parseInt(lastNumber) + 1
        } else {
            lastNumber = 1
        }

        const fileName = `${lastNumber.toString()}_auto_migration_${Date.now().toString()}`
        
        const pathToWriteMigrations = path.join(settings.BASE_PATH, appName, 'migrations')
        if (!fs.existsSync(pathToWriteMigrations)) {
            fs.mkdirSync(pathToWriteMigrations)
            fs.writeFile(path.join(pathToWriteMigrations, 'index.js'), '', function (err) {
                if (err) return console.log(err);
            })

        }        
        
        fs.writeFile(path.join(pathToWriteMigrations, fileName + '.js'), file, function (err) {
            if (err) return console.log(err);
            logger.INFO.CREATED_MIGRATION(fileName, appName)
        })
        return fileName
    }

    let migrations = retrieveMigrations(settings)
    migrations = reorderMigrations(migrations)

    // i've spent so many time on this that i don't find it even funny, let me explain the idea and the problems:
    // Edge case nº1: Just one difference
    // Edge case nº2: 2 differences, one of an app, and the other from another app
    // So what we do is, everytime the name of the app changes we generate a file, and last but not lest
    // when the loop finishes the appname does not change so we force the file generation.
    let lastAppName = differencesList[0].appName
    let differenceListToConsider = [differencesList[0]]
    let lastFileNameGenerated = migrations.length > 0 ? migrations[migrations.length-1].migrationName : ''
    for (let differenceIndex = 0; differenceIndex < differencesList.length; differenceIndex++) {
        if (lastAppName !== differencesList[differenceIndex].appName) {
            lastFileNameGenerated = generateFile(lastAppName, differenceListToConsider, lastFileNameGenerated)
            differenceListToConsider = []
        } 
        
        if (differenceIndex !== 0) {
            differenceListToConsider.push(differencesList[differenceIndex])
        }
        lastAppName = differencesList[differenceIndex].appName
    }
    lastFileNameGenerated = generateFile(lastAppName, differenceListToConsider, lastFileNameGenerated)
}


module.exports = generateFiles