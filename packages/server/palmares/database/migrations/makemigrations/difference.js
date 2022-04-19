/**
 * @module config/database/migrations/makemigrations/difference
 */

const operations = require('./operations')
const asker = require('./ask')


/**
 * Most of the logic from getting differences from models or attributes to detect any change is basically equal
 * so what we do is add the default logic here in a function and call callbacks when a particular
 * action had happened, like rename of column/model, creation of column/model and such so this way
 * we do not need to repeat the same code over and over make it slick and simple to understand and maintain
 * 
 * We try to not make guesses here we ask the user whenever we feel necessary if he made a change or not.
 * 
 * @param {Object} originalModelsOrAttributesObject - The original models or attributes object that we can use for transversing
 * and comparing, this is how the state is right now, the actual state
 * @param {Object} stateModelsOrAttributesObject - This is the state models, retrieved from the state generated from the state
 * function.
 * @param {Function} callbackIfRenamed - A callback function to be called when a attribute or when a model was renamed
 * @param {Function} callbackIfCreated - A callback function to be called when a attribute or when a model was created
 * @param {Function} callbackIfDeleted - A callback function to be called when a attribute or when a model was deleted
 * @param {Function} callBackIfChanged - A callback function to be called when a attribute or when a model was changed
 */
async function getDifferenceFromModelsOrAttributes(
    originalModelsOrAttributesObject, stateModelsOrAttributesObject, callbackIfRenamed, 
    callbackIfCreated, callbackIfDeleted, callBackIfChanged
) {
    const originalAttributesOrModelsEntries = Object.entries(originalModelsOrAttributesObject)
    const stateAttributesOrModelsEntries = Object.entries(stateModelsOrAttributesObject)

    let modelsOrAttributesInOriginalButNotDefinedInState = []
    let modelsOrAttributesInStateButNotDefinedInOriginal = []

    // Check if something is in state that is not on original. In other words, check if any attribute or model was removed
    for (const [stateAttributeOrModelName, stateAttributeOrModelObject] of stateAttributesOrModelsEntries) {
        const didRenamedAttributeNameOrModelName = originalModelsOrAttributesObject[stateAttributeOrModelName] === undefined         

        if (didRenamedAttributeNameOrModelName) {
            if (originalAttributesOrModelsEntries.length === stateAttributesOrModelsEntries.length) {
                // ask if user renamed
                let renamedTo = ''
                for (let i=0; i<originalAttributesOrModelsEntries.length; i++) {
                    const originalModelOrAttributeName = originalAttributesOrModelsEntries[i][0]
                    if(stateModelsOrAttributesObject[originalModelOrAttributeName] === undefined) {
                        renamedTo = originalModelOrAttributeName
                        break
                    }
                }
               
                if (await asker.didUserRename(stateAttributeOrModelName, renamedTo)) {
                    const originalModelOrAttribute = originalModelsOrAttributesObject[renamedTo]
                    const stateModelOrAttribute = stateModelsOrAttributesObject[stateAttributeOrModelName]
                    await callbackIfRenamed(stateAttributeOrModelName, renamedTo, stateModelOrAttribute, originalModelOrAttribute)

                    // We change the name of the state model or attribute to the actual name, so we can compare other stuff
                    // also now when we loop though the original models or attributes it will not catch as it was renamed
                    stateModelsOrAttributesObject[renamedTo] = stateAttributeOrModelObject
                    delete stateModelsOrAttributesObject[stateAttributeOrModelName]
                } else {
                    await callbackIfDeleted(stateAttributeOrModelName, stateAttributeOrModelObject)
                }
            } else {
                // we cannot make guesses, for example in case like originalAttributes = {parameterName, name}, stateAttribute={createdAt}. 
                // it's not clear that one of {parameterName} or {name} was added and the other was renamed, or both of them could be added and {createdAt} 
                // would be removed, it's not clear for us, so we need to prompt the user in that use case

                // For cases like originalAttributes = {parameterName, name} {}, it's clear that both was added. Or if {} {createdAt} it's clear that
                // one was removed so we can make safe guesses
                modelsOrAttributesInStateButNotDefinedInOriginal.push(stateAttributeOrModelName)
            }
        }
    }

    for (const [originalAttributeOrModelName, originalAttributeOrModelObject] of originalAttributesOrModelsEntries) {
        const stateAttributeOrModelObject = stateModelsOrAttributesObject[originalAttributeOrModelName]
        // created 
        if (stateAttributeOrModelObject === undefined) {
            // we already asked and changed the state so a new was definetly created
            if (originalAttributesOrModelsEntries.length === stateAttributesOrModelsEntries.length) {
                await callbackIfCreated(originalAttributeOrModelName, originalAttributeOrModelObject)
            } else {
                // we cannot make guesses, for example in case like originalAttributes = {parameterName, name}, stateAttribute={createdAt}. 
                // it's not clear that one of {parameterName} or {name} was added and the other was renamed, or both of them could be added and {createdAt} 
                // would be removed, it's not clear for us, so we need to prompt the user in that use case

                // For cases like originalAttributes = {parameterName, name} stateAttribute={}, it's clear that both was added. Or if {} {createdAt} it's clear that
                // one was removed so we can make safe guesses
                modelsOrAttributesInOriginalButNotDefinedInState.push(originalAttributeOrModelName)
            }
        } else {
            await callBackIfChanged(originalAttributeOrModelName, stateAttributeOrModelObject, originalAttributeOrModelObject)
        }
    }

    // on this case we can safely guess it was added
    if (modelsOrAttributesInOriginalButNotDefinedInState.length > 0 && modelsOrAttributesInStateButNotDefinedInOriginal.length === 0) {      
        for (const originalAttributeOrModelNameToAdd of modelsOrAttributesInOriginalButNotDefinedInState) {  
            const originalAttributeOrModelObject = originalModelsOrAttributesObject[originalAttributeOrModelNameToAdd]
            await callbackIfCreated(originalAttributeOrModelNameToAdd, originalAttributeOrModelObject)
        }
    } else if (modelsOrAttributesInStateButNotDefinedInOriginal.length > 0 && modelsOrAttributesInOriginalButNotDefinedInState.length === 0) {
        // we can safely guess it was removed
        for (const stateAttributeOrModelNameToRemove of modelsOrAttributesInStateButNotDefinedInOriginal) {
            const stateAttributeOrModelObject = stateModelsOrAttributesObject[stateAttributeOrModelNameToRemove]
            await callbackIfDeleted(stateAttributeOrModelNameToRemove, stateAttributeOrModelObject)
        }
    } else {
        let nonRenamedAttributesOrModels = [...modelsOrAttributesInOriginalButNotDefinedInState]
        // same as before, first we loop through state objects and then we loop through newly defined models

        for (const attributeOrModelNameInState of modelsOrAttributesInStateButNotDefinedInOriginal) {
            let answer = false
            if (nonRenamedAttributesOrModels.length !== 0) {
                answer = await asker.didUserRenameToOneOption(attributeOrModelNameInState, nonRenamedAttributesOrModels)
            }

            const stateAttributeOrModelObject = stateModelsOrAttributesObject[attributeOrModelNameInState]

            if (answer === false) {
                // was deleted
                await callbackIfDeleted(attributeOrModelNameInState, stateAttributeOrModelObject)
            } else {
                // was renamed
                const originalModelOrAttributeObject = originalModelsOrAttributesObject[answer]
                await callbackIfRenamed(attributeOrModelNameInState, answer, stateAttributeOrModelObject, originalModelOrAttributeObject)

                const indexOfSelectedAnswer = nonRenamedAttributesOrModels.indexOf(answer)
                nonRenamedAttributesOrModels.splice(indexOfSelectedAnswer, 1)
                
                // We change the name of the state model to the actual name, so we can compare other stuff
                // also now when we loop though the original models it will not catch as it was renamed
                stateModelsOrAttributesObject[answer] = stateAttributeOrModelObject
                delete stateModelsOrAttributesObject[attributeOrModelNameInState]
            }
        }
        for (const attributeOrModelNameInOriginal of modelsOrAttributesInOriginalButNotDefinedInState) {
            const originalAttributeOrModelObject = originalModelsOrAttributesObject[attributeOrModelNameInOriginal]
            const stateAttributeOrModelObject = stateModelsOrAttributesObject[attributeOrModelNameInOriginal]

            if (stateAttributeOrModelObject === undefined) {
                // we already asked and changed the state so a new was definetly created
                await callbackIfCreated(attributeOrModelNameInOriginal, originalAttributeOrModelObject)
            } else {
                await callBackIfChanged(attributeOrModelNameInOriginal, stateAttributeOrModelObject, originalAttributeOrModelObject)
            }
        }
    }
}

/**
 * This gets the difference by each attribute, if a column was added, renamed or such.
 * This is basically the SAME as `.getDifferenceFromModels()` function except we are dealing with 
 * attributes and not models.
 * 
 * @param {Array<object>} differences - An array that holds the difference objects, the difference object structure can be found in
 * './operations.js', we change the structure of the operation depending on the difference type
 * @param {object} appNameByModelName - An object that holds the modelName as key and the appName as value.
 * @param {string} modelName - The model name that we are dealing with
 * @param {object} originalModelObject - The original model, this is how it is at the current time.
 * @param {object} stateModelObject - The state model, this is how the model was before making the migration.
 */
async function getDifferenceFromAttributes(differences, appNameByModelName, modelName, originalModelObject, stateModelObject) {
    const originalModelAttributes = originalModelObject.attributes
    const stateModelAttributes = stateModelObject.attributes

    async function callbackIfCreated(originalAttributeName, originalAttributeObject) {
        if (originalAttributeObject.defaultValue === undefined && originalAttributeObject.allowNull === false) {
            const answer = await asker.theNewAttributeCantHaveNullDoYouWishToContinue(modelName, originalAttributeName)
            if (answer === false) {
                return process.exit(1)
            }
        } 
        differences.push(
            operations.createColumn(
                appNameByModelName[modelName], 
                modelName,
                originalAttributeName,
                originalAttributeObject
            )
        )
    }
    
    async function callbackIfDeleted(stateAttributeName, stateAttributeObject) {
        differences.push(
            operations.removeColumn(
                appNameByModelName[modelName],
                modelName, 
                stateAttributeName
            )
        )
    }

    async function callbackIfRenamed(nameBeforeInState, nameAfterInOriginal, stateAttributeObject, originalAttributeObject){
        differences.push(
            operations.renameColumn(
                appNameByModelName[modelName],
                modelName,
                nameAfterInOriginal,
                nameBeforeInState,
                originalAttributeObject
            )
        )
    }

    async function callBackIfChanged(attributeName, stateAttributeObject, originalAttributeObject) {
        // Reference: https://sequelize.org/master/class/lib/model.js~Model.html#static-method-init
        const stateAttributeData = {...stateAttributeObject}
        const originalAttributeData = {...originalAttributeObject}

        delete stateAttributeData.attributeName
        delete originalAttributeData.attributeName
        delete originalAttributeData.databaseName
        delete stateAttributeData.databaseName

        let isAttributesEqual = stateAttributeObject.constructor.name === originalAttributeObject.constructor.name && 
                            JSON.stringify(originalAttributeData) === JSON.stringify(stateAttributeData)
        if (!isAttributesEqual) {
            differences.push(
                operations.changeColumn(
                    appNameByModelName[modelName],
                    modelName,
                    attributeName,
                    stateAttributeObject,
                    originalAttributeObject
                )
            )
        }
    }

    await getDifferenceFromModelsOrAttributes(originalModelAttributes, stateModelAttributes, callbackIfRenamed, callbackIfCreated, callbackIfDeleted, callBackIfChanged)

}


/**
 * This is used to get the difference on the table/model level not it's attributes. We just change and append data in the `differences.js`
 * array, we do not return anything from this function. Since the structure to check if either a model or an attribute has changed is the
 * same we use the same function for checking if the model or attributes are equal.
 * 
 * @param {Array<object>} differences - The objects in this array are defined in './operations.js', this way you can know
 * the structure of the object
 * @param {Object} appNameByModelName - It is a object without nested objects or arrays, it is an object where each key
 * is a String. The key is the modelName and the value is the appName.
 * @param {object} originalModelsByModelName - An object where each key is the modelName and each value is the value of the model
 * in the current state when the makemigration is running.
 * @param {object} stateModelsByModelName - The same as the originalModelsByModelName except that this is the state of the model.
 * We get the state by checking each migration in order and building the model. This will get the last model.
 */
async function getDifferenceFromModels(
    differences, appNameByModelName, originalModelsByModelName, 
    stateModelsByModelName
) {
    async function callbackIfCreated(originalModelName, originalModelObject) {
        const attributes = originalModelObject.attributes
        const options = originalModelObject.options
        differences.push(
            operations.createModel(appNameByModelName[originalModelName], originalModelName, attributes, options)
        )
    }

    async function callbackIfDeleted(stateModelName, _) {
        // Get app name here
        differences.push(
            operations.deleteModel(appNameByModelName[stateModelName], stateModelName)
        )
    }

    async function callbackIfRenamed(nameBeforeInState, nameAfterInOriginal, stateModelObject, originalModelObject) {
        differences.push(
            operations.renameModel(appNameByModelName[nameAfterInOriginal], nameBeforeInState, nameAfterInOriginal)
        )
    }

    async function callBackIfChanged(modelName, stateModelObject, originalModelObject) {
        const stateModelOptions = {...stateModelObject.options}
        const originalModelOptions = {...originalModelObject.options}

        // leave it for the attributes instead of validating here.
        delete stateModelOptions.primaryKeyField
        delete originalModelOptions.primaryKeyField

        const isStateModelDifferentFromOriginalModel = JSON.stringify(originalModelOptions) !== JSON.stringify(stateModelOptions)
        
        if (isStateModelDifferentFromOriginalModel) {
            differences.push(
                operations.changeModel(appNameByModelName[modelName], modelName, stateModelObject.options, originalModelObject.options)
            )
        }

        //getDifferenceFromIndexes(differences, originalModelName, originalModelObject?.options?.indexes, stateModelObject?.options?.indexes)
        await getDifferenceFromAttributes(differences, appNameByModelName, modelName, originalModelObject, stateModelObject)
    }

    await getDifferenceFromModelsOrAttributes(originalModelsByModelName, stateModelsByModelName, callbackIfRenamed, callbackIfCreated, callbackIfDeleted, callBackIfChanged)
}

/**
 * Simple API to be used to get the difference between the current state and the state before the makemigration.
 * 
 * Since array and objects are passed as reference and not by value what we do is just append data in the `differences`
 * array that is created inside of this function, then we return this data.
 * 
 * @param {object} appNameByModelName - An object that holds the modelName as key and the appName as value.
 * @param {object} originalModelsByModelName - An object where each key is the modelName and each value is the actual model state.
 * This holds the current state of the model.
 * @param {object} stateModelsByModelName - An object where each key is the modelName and each value is the model state. Model
 * states are created from the migrations, from the migrations we get the current state of the model and create the model as it
 * were before the makemigration.
 * 
 * @returns {Promise<Array<{
 *      action: string,
 *      appName: string,
 *      order: number,
 *      modelName: string,   
 *      dependsOn: Array<string>,
 *      data: object
 *}>>} - An object that holds the differences. The objects in this array are defined in './operations.js', this way you can know
 * the structure of the object
 */
async function getDifference(appNameByModelName, originalModelsByModelName, stateModelsByModelName) {
    let differences = []

    await getDifferenceFromModels(
        differences, 
        appNameByModelName, 
        originalModelsByModelName, 
        stateModelsByModelName
    )
    return differences
}

module.exports = getDifference