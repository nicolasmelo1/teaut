/**
 * Responsible for retrieving migrations in a new order, this order will respect the dependencies.
 * Sometimes you might have apps outside of the project in distinct packages, the idea is that
 * it will be possible to use those apps as if they were your app. But not right now, since this is not
 * a framework just a helper for the project we will only accept migrations from apps within the project
 * 
 * @param {Array<object>} migrations - Check '../helpers.js' on the `retrieveMigrations` function for more info
 * on how the structure of the migrations object is. To make it simple and less scary, the structure of each object in
 * this array is:
 * {
 *      appName: {string} - The name of the app where this migration file was generated,
 *      migrationName: {string} - The name of the migration file,
 *      migration: {object} - The object of the migration file. You can see the structure of the object 
 *                            on the ./makemigrations/generate.js file. To make it simple the object from this file
 *                            will contain: `engine` - The engine to use in the migration, the `dependency` - on which file
 *                            the migration depends on. We actually use this in this function, and last but not least the
 *                            `operations` - which is a function on all the operations that will be executed on the database.
 * }
 * 
 * @returns {Array<object>} - The migrations array again but ordered by its dependencies.
 */
const reorderMigrations = (migrations) => {
    let pendingMigrations = migrations

    let newMigrations = []
    let count = 0
    while (pendingMigrations.length > 0 && count < 1000) {
        let newPendingMigrations = []
        for (let i=0; i<pendingMigrations.length; i++) {
            if (pendingMigrations[i].migration.dependency === '') {
                newMigrations.splice(0, 0, pendingMigrations[i])
            } else {
                const indexOfDependency = newMigrations.findIndex(migration=> migration.migrationName === pendingMigrations[i].migration.dependency)
                if (indexOfDependency !== -1) {
                    newMigrations.splice(indexOfDependency+1, 0, pendingMigrations[i])
                } else {
                    newPendingMigrations.push(pendingMigrations[i])
                }
            }
        }
        pendingMigrations = newPendingMigrations
        count++
    }
    
    return newMigrations
}

/**
 * Check what is dependent on what, and with that create a graph of the differences so we can add everything in order.
 * 
 * This is not a graph actually it's more a ordered list.
 * 
 * How we order? By doing 2 loops
 * - The first loop we define the order of the models as well as it's dependencies
 * - The second loop we rearrange the ordering of the differences in a newDifference array
 * to rearrage we use the idea of getting the farthest index of the references of the model.
 * The idea is that, if the model depends on 'Company' and 'Profile' models, and the 
 * newDifferences list is like:
 * ['CompanyType', 'Company', 'Profile, 'User'] 
 * we will add the new model AFTER 'Profile' since Profile is the farthest reference, 'Company' is second.
 * 
 * @param {object} originalModels - The current models of this state, it's not from the state but it's more a picture on how
 * the model is right now. This is each model by the model names.
 * @param {object} stateModels - Similar to `originalModels` except that we hold each state model as value. State models is how
 * the model was before running the migration/makemigrations.
 * @param {Array<object>} differences - The differences between the current state and the state before running the migration/makemigrations.
 */
const reorderDifferences = (originalModels, stateModels, differences) => {
    let newDifferences = []
    // first we get the models defined in the migration and set the ordering of each action
    // we also check and update the values each model is depent on.
    let modelNamesInDifferencesDependentOn = {}
    for (let index = 0; index<differences.length; index++) {
        const differenceObject = differences[index]
        const differenceModelName = differenceObject.modelName
        differenceObject.order = index
        if (modelNamesInDifferencesDependentOn[differenceModelName] === undefined) {
            const modelDefition = originalModels[differenceModelName] === undefined ? 
                stateModels[differenceModelName] : originalModels[differenceModelName]
            const modelAttributes = modelDefition.attributes
            let dependsOn = []
            Object.values(modelAttributes).forEach(attributeObject => {
                const existsRelationInDifferences = differences.findIndex(difference => difference.modelName === attributeObject.relatedTo)
                // ignore self referencing dependencies as dependencies so they appear first and prevent errors
                if (attributeObject.relatedTo && existsRelationInDifferences !== -1 && attributeObject.relatedTo !== differenceModelName) {
                    dependsOn.push(attributeObject.relatedTo)
                }
            })
            modelNamesInDifferencesDependentOn[differenceModelName] = dependsOn
        }
        differenceObject.dependsOn = modelNamesInDifferencesDependentOn[differenceModelName]
    }

    // this second loop will define the new ordering, this ordering will try to keep each action from each app
    // as close as possible while also respecting the ordering for the models so we don't have conflicts like
    // a table being created that is dependent of a table that was not created.
    // Really cool right?
    let count = 0
    while (differences.length > 0 && count < 100) {
        let noDependenciesDifferences = []
        let pendingDifferences = []
        for (let index = 0; index<differences.length; index++) {
            const differenceObject = differences[index]
            if (differenceObject.dependsOn.length === 0) {
                // we use this to maintain the default order, if we didn't make this `renameColumn` would come after `changeColumn` action
                // which is wrong, we need first the rename and THEN the change action.
                noDependenciesDifferences.push(differenceObject)
            } else {
                let indexOfFarthestDependency = -1
                differenceObject.dependsOn.forEach(dependsOnModelName => {
                    const indexOfDependency = newDifferences.findIndex(element=>element.modelName === dependsOnModelName)
                    if (indexOfDependency > indexOfFarthestDependency) {
                        indexOfFarthestDependency = indexOfDependency
                    }
                })
                if (indexOfFarthestDependency === -1 && index !== differences.length - 1) {
                    pendingDifferences.push(differenceObject)
                } else {
                    // we will resolve issues for the changeModel or changeColumn actions 
                    // coming first from the `renameModel` or `renameColumn` actions.
                    let indexToAddDifference = indexOfFarthestDependency + 1
                    let differenceAtPosition = newDifferences[indexToAddDifference]
                    while(differenceAtPosition && differenceAtPosition.action.toLowerCase().includes('rename')) {
                        indexToAddDifference++
                        differenceAtPosition = newDifferences[indexToAddDifference]
                    }
                    newDifferences.splice(indexToAddDifference, 0, differenceObject)
                }
            }
        }
        newDifferences = [...noDependenciesDifferences, ...newDifferences]
        differences = pendingDifferences
    }

    return newDifferences
}

module.exports = {
    reorderMigrations,
    reorderDifferences
}