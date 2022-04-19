const getMigrationObjectStructure = (action, appName, modelName) => {
    return {
        action: action,
        appName: appName,
        order: 0,
        modelName: modelName,
        dependsOn: [],
        data: {}
    }
}

function createModel(appName, modelName, attributes, options) {
    const data = getMigrationObjectStructure('createModel', appName, modelName)
    
    data.data.options = options
    data.data.attributes = attributes

    return data
}

const changeModel = (appName, modelName, modelOptionsBefore, modelOptionsAfter) => {
    const data = getMigrationObjectStructure('changeModel', appName, modelName)

    data.data.optionsBefore = modelOptionsBefore
    data.data.optionsAfter = modelOptionsAfter
    
    return data
}

const deleteModel = (appName, modelName) => {
    const data = getMigrationObjectStructure('deleteTable', appName, modelName)

    return data
}


const createColumn = (appName, modelName, attributeName, attributeDefinition) => {
    const data = getMigrationObjectStructure('createColumn', appName, modelName)
    
    data.data.attributeName = attributeName
    data.data.attributeDefinition = attributeDefinition

    return data
}

const changeColumn = (appName, modelName, attributeName, attributeDefinitionBefore, attributeDefinitionAfter) => {
    const data = getMigrationObjectStructure('changeColumn', appName, modelName)

    data.data.attributeName = attributeName
    data.data.attributeDefinitionBefore = attributeDefinitionBefore
    data.data.attributeDefinitionAfter = attributeDefinitionAfter
    
    return data
}

const renameColumn = (appName, modelName, attributeNameAfter, attributeNameBefore, attributeDefinition) => {
    const data = getMigrationObjectStructure('renameColumn', appName, modelName)

    data.data.attributeNameAfter = attributeNameAfter
    data.data.attributeNameBefore = attributeNameBefore
    data.data.attributeDefinition = attributeDefinition

    return data
}

const removeColumn = (appName, modelName, attributeName) => {
    const data = getMigrationObjectStructure('removeColumn', appName, modelName)

    data.data.attributeName = attributeName

    return data
}

const renameModel = (appName, modelNameBefore, modelNameAfter) => {
    const data = getMigrationObjectStructure('renameModel', appName, modelNameAfter)

    data.data.modelNameBefore = modelNameBefore
    data.data.modelNameAfter = modelNameAfter

    return data
}

module.exports = {
    createModel,
    changeModel,
    deleteModel,
    renameModel,
    createColumn,
    changeColumn,
    renameColumn,
    removeColumn
}