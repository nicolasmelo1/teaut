const fields = require('./fields')
const { getEngineInstance, models } = require('../database')
const { ValidationError } = require('./errors')


/**
 * At the end serializer is just a simple field (that's exactly why we can use it as a field of another serialiers)
 * 
 * The serializer is responsible for formatting the data that is sent to the client but also formatiing and validating the data
 * that is retrieved from the client.
 * 
 * Although it's not as simple as joi. It's more dynamic than it because since we actually control how the model is created we 
 * can create model serializers which can check and validate the data dynamically.
 * 
 * Since this hole framework is heavily inspired by django, this copies almost exactly the funcionality from django rest framework.
 * So if you want to know more about django rest framework, check out the docs of it.
 * 
 * To define serializers you need to extend this class like
 * ```
 * class UserSerializer extends serializers.Serializer {
 *      fields = {
 *          name: new serializers.CharField()
 *          email: new serializers.CharField({ required: false })
 *      }
 * }
 * ```
 * 
 * You can also define nested serializers like:
 * 
 * ```
 * class CompanySerializer extends serializer.Serializer {
 *      fields = {
 *          name: new serializers.CharField()
 *          companyTypeId: new serializers.IntegerField()
 *      }
 * }
 * 
 * class UserSerializer extends serializers.Serializer {
 *      fields = {
 *          name: new serializers.CharField()
 *          email: new serializers.CharField({ required: false }),
 *          company: new CompanySerializer() // this is a nested serializer
 *      }
 * }
 * ```
 * The above will generate the following JSON:
 * ```json
 * {
 *    "name": "John",
 *    "email": "john@example.com",
 *    "company": {
 *       "name": "Example",
 *       "companyTypeId": 1
 *    }
 * }
 * ```
 * 
 * What about times when we have a list? For example for the following json:
 * ```json
 * {
 *    "name": "John",
 *    "email": "john@example.com",
 *    "companies": [{
 *       "name": "Example",
 *       "companyTypeId": 1
 *    }, {
 *       "name": "Another Company",
 *       "companyTypeId": 1
 *    }]
 * }
 * ```
 * 
 * Simple, you will need to define it like this:
 * ```
 * class CompanySerializer extends serializer.Serializer {
 *      fields = {
 *          name: new serializers.CharField()
 *          companyTypeId: new serializers.IntegerField()
 *      }
 * }
 * 
 * class UserSerializer extends serializers.Serializer {
 *      fields = {
 *          name: new serializers.CharField()
 *          email: new serializers.CharField({ required: false }),
 *          companies: new CompanySerializer({ many: true }) // notice for `many`
 *      }
 * }
 * ```
 * 
 * The `many` option in the serializer will guarantee that the output of this serializer will be an array, and also that ALL OF THE VALUES inside of this serializer
 * matches the object struct defined in your serializer.
 * 
 * 
 * HOW DO WE SEND DATA FROM THE PARENT TO THE CHILDREN? 
 * - USING THE CONTEXT. It's not like a context api in react, context is a simple object that we will pass for every child serializer.
 * 
 */
class Serializer extends fields.Field {
    fields = {}
    
    /**
     * At the end serializer is just a simple field (that's exactly why we can use it as a field of another serialiers)
     * 
     */
    constructor({data=null, instance=null, many=false, context={},...rest} = {}) {
        super(rest)
        this.instance = instance
        this.internalData = data
        this.many = many
        this.context = context
    }

    /**
     * The api users must call in order to save, i actually wanted to use save directly but programmers would need to call 
     * this.ToInternal() everytime, which is not actually good enough. So because of that we implemented this method to be used 
     * as an api. `save` will not be supposed to be called directly never.
     * 
     * @param {...args} - You can pass any argument to this function, on your `.save()` method the first argument will ALWAYS be the
     * validated data and the second argument will be the arguments you pass here, this means you can pass any argument as you wish to
     * the serializer `save()` method.
     * 
     * For example, if you call 
     * ```
     * serializer.toSave(companyId, userId)
     * ```
     * 
     * Your save method will need to be defined like:
     * ```
     * async save(data, companyId, userId) {
     *      // your code here.
     * }
     * ```
     *  
     * @returns {Any} - Can return anything from the save method we don't actually care much about the return the programmer can return
     * whatever he/she wants. Remember that this return is from the `save` method and NOT the `toSave`.
     */
    async toSave(...args) {
        if (this.validatedData) {
            return await this.save(this.validatedData, ...args)
        } else {
            throw new Error('You must call `isValid()` before trying to save your data. If the function returned false then the value you are trying to insert is not valid for some reason.' + 
                            ' If that happened the error can be found calling .error() function.')
        }
    }

    /**
     * MUST be implemented in your serializer in order to work, if not implemented, it will not work and throw an error.
     * This also handles passing any aditional arguments to the function so you can access any data that you need.
     * 
     * @param {Any} data - Return any type of data, the programmer must define what he wants to return.
     */
    async save(data, ...args) {
        throw new Error(`To save save data, you should define the 'save' method inside the '${this.constructor.name}' class to save data. Example:\n> async save(data) {\n\t// code here\n}`)
    }

    /**
     * Is valid will run the `toInternal` to validate the data and the validated data will be appended to `this.validatedData`
     * if an error occurs we will append the error data to _error. It has an underline because `_error` is not supposed to
     * be called directly, you should call `error()` to get the error.
     * 
     * @returns {Promise<Boolean>} - Returns true or false, true if the data is valid and false if not.
     */
    async isValid(...args) {
        try {
            this.validatedData = await this.toInternal(undefined, ...args)
            return true
        } catch (e) {
            if (e instanceof ValidationError) {
                this._error = JSON.parse(e.message)
                return false
            } else {
                throw e
            }
        }
    }

    error() {
        if (this._error === undefined) {
            throw new Error(`You can only call this function if you called 'isValid()' and it returned false, otherwise this function is not available to be called.`)
        } else {
            const error = JSON.parse(JSON.stringify(this._error))
            return error
        }
    }

    /**
     * This is how we represent the data for the user when we are sending it to the client.
     */
    async toRepresentation(data=undefined, ...args) {
        if (data === undefined && this.instance !== null) {
            data = this.instance
        } else if (data === undefined && Object.keys(this.fields).length === 0) {
            data = {}
        } else if (data === undefined) {
            throw new Error(`You should pass the 'instance' option in ${this.constructor.name} initialization before calling 'toRepresentation' method. Example: \nnew ${this.constructor.name}({instance: { fieldName: "value1"}})`)
        }
        return await this.#getData('toRepresentation', data, ...args)
    }

    async toInternal(data=undefined, ...args) {
        if (data === undefined && this.internalData !== null) {
            data = this.internalData
        } else if (data === undefined && Object.keys(this.fields).length === 0) {
            data = {}
        } else if (data === undefined) {
            throw new Error(`You should pass the 'data' option in ${this.constructor.name} initialization before calling 'toInternal' method. Example: \nnew ${this.constructor.name}({data: { fieldName: "value1"}})`)
        }
        return await this.#getData('toInternal', data, ...args)
    }

    /**
     * Responsible for retrieving the data for either the toInternal and toRepresentation functions since the logic is basically the same.
     * Although the functionality is basically the same ther is some differences, for example: `source` will only work in `toRepresentation`
     * for `toInternal` the `source` will not work and will retrieve nothing.
     * 
     * @param {('toRepresentation' | 'toInternal')} functionToCallInChildren - This is the name of the function to call in the fields
     * @param {Any} data - The data recieved for this serializer.
     * @returns {(Array<Object>| Object)} - We can return either an array of objects or an object, the hole configuration of this object will be defined in your serializer.
     */
    async #getData(functionToCallInChildren, data, ...args) {
        const formatObjectInstance = async (instance, ...args) => {
            const newInstance = {}

            if ([undefined, null].includes(instance)) return instance
            
            for (const [key, field] of Object.entries(this.fields)) {
                // By default we try to get the value in the object by the key
                field._fieldName = key
                // Ignore field means that we will not consider it in the `toRepresentation` or the `toInternal`
                let ignoreField = false
                
                let valueOfFieldInInstance = instance[key]
                valueOfFieldInInstance = field.setDefaultValue(valueOfFieldInInstance)
                if (functionToCallInChildren === 'toRepresentation') {
                    if (field.source !== null && valueOfFieldInInstance == undefined) {
                        valueOfFieldInInstance = field._getSource(instance)
                    }
                    if (field.writeOnly === true) ignoreField = true
                    
                    field.instance = instance
                } else {
                    
                    if (field.readOnly === true) ignoreField = true
                    field.internalData = valueOfFieldInInstance
                }
                if (field.required === false && valueOfFieldInInstance === undefined) ignoreField = true
                // with context we are able to pass data to the children that is not in the object itself.
                field.context = this.context
                
                // if the field allows null and the value is null we do not do any validation or cleaning of the data.
                if (field.allowNull === true && valueOfFieldInInstance === null) {
                    newInstance[key] = valueOfFieldInInstance
                } else {
                    //`functionToCallInChildren` is either `toRepresentation` or `toInternal`
                    if (ignoreField === false) {                    
                        const fieldValue = await field[functionToCallInChildren](valueOfFieldInInstance, ...args)
                        if (fieldValue !== undefined) newInstance[key] = fieldValue
                    }
                }
            }
            // setting the value to undefined will trigger the checks on the parent `toRepresentation` and `toInternal`, 
            // if the fields of the serializer are not defined then we just pass (the serializer hasn't implemented the `fields = {}` object)
            return Object.keys(newInstance).length > 0 || Object.keys(this.fields).length === 0  ? newInstance : undefined
        }

        let newData = []

        if (this.many && ![undefined, null].includes(data)) {
            if (Array.isArray(data)) {
                for (const arrayData of data) {
                    const dataFromParent = await super[functionToCallInChildren](await formatObjectInstance(arrayData), ...args)
                    newData.push(dataFromParent)
                }
            } else {
                throw new Error(`When using 'many' option as true, the 'data' or 'instance' options NEED to be an Array. If you are not working with arrays, then `+
                                `set 'many' to false or you can just not set it in the options object. To help you troubleshoot override toRepresentation method and `+
                                `check if the data recieved is an array or not. Example: \n async toRepresentation(data) {\n\tconsole.log(data)\n})`)
            }
        } else {
            if (Array.isArray(data) && this.many === false) {
                throw new Error(`You are passing an array to the serializer while 'many' option is set to false. Please set "many: true" in the ${this.constructor.name} class initialization.`)
            }
            newData = await super[functionToCallInChildren](await formatObjectInstance(data), ...args)
        }
        return newData
    }
}


/**
 * @typedef {Object} ModelSerializerOptions
 * @property {import('../database/model').Model} model - The model that we are working with.
 * @property {Array<string>} [fields] - The fields that we want to include in the serializer. This is optional because you can also use 'exclude'
 * @property {Array<string>} [exclude] - The fields that we want to exclude from the serializer. This is optional because you can also use 'fields'
 */

/**
 * This serializer is supposed to translate everything for you without needing to define every field in the serializer which can be
 * a tedious thing to do.
 * 
 * `id` is not added by default since it is dynamically added to each model. To add it you must define it explicitly in the `fields` option
 * in your serializer.
 * 
 * ATTENTION: you can still define custom fields in `fields` that are not defined in the model, but be aware, the fields you define in `fields`
 * of your class does not need to be defined in your `options` `fields`.
 */
class ModelSerializer extends Serializer {
    /** @type {ModelSerializerOptions} options */
    options = {
        model: null,
        fields: [],
        exclude: []
    }
    
    modelFieldsToSerializerFields = [
        [models.fields.CharField, fields.CharField],
        [models.fields.TextField, fields.CharField],
        [models.fields.AutoField, fields.IntegerField],
        [models.fields.BigAutoField, fields.IntegerField],
        [models.fields.IntegerField, fields.IntegerField],
        [models.fields.BigIntegerField, fields.IntegerField],
        [models.fields.DecimalField, fields.DecimalField],
        [models.fields.BooleanField, fields.BooleanField],
        [models.fields.DateField, fields.DateField],
        [models.fields.DatetimeField, fields.DateTimeField],
        [models.fields.TimeField, fields.TimeField],
        [models.fields.ForeignKeyField, fields.IntegerField],
        [models.fields.OneToOneField, fields.IntegerField],
        [models.fields.UUIDField, fields.CharField],
    ]

    constructor(options={}) {
        super(options)
        this.updatedFieldsWithOptions = false        
    }

    /**
     * used for validating if the user had defined a model for the serializer
     * in the `options` part in the class and also if he had defined the specific fields he want to use
     * from the model.
     */
    validateBasicConfig() {
        if (this?.options?.model === undefined || !this.options.model instanceof models.Model) {
            throw new Error('Must define and pass a `model` in `options` key in serializer.')
        }
        if (this?.options?.fields !== undefined && this.options.fields === undefined && this.options.exclude === undefined) {
            throw new Error('Must define either `fields` key in `options` or `exclude`. Define just one of them, not both.')
        }
        if (this?.options?.fields !== undefined && this.options.fields !== undefined && this.options.exclude !== undefined) {
            throw new Error('Must define either `fields` key in `options` or `exclude`. Define just one of them, not both.')
        }
    }

    /**
     * Used for translating the model attributes to field attributes in the serializers. I know, we created both, but it's nice to keep
     * those separated because if we make changes in the serializers it will not affect the models. That's why we don't keep both
     * linked and an exact ctrl+c ctrl+v of one another, we've created the fields of the serializers and the fields to be used on the models.
     * 
     * @param {object} formattedModelFieldOptions - This is the object of the formatted options of the field without retrieving knowing it's type
     * and anything else. We use this basically to retrieve the actual name of the field.
     * @param {object} originalModelFieldOptions - This is the original object defined in the model, exactly as is.
     * 
     * @returns {object} - Returns the formated object that will fit any field type in the serializers.
     */
    translateAttributes(formattedModelFieldOptions, originalModelFieldOptions) {
        let options = {}
        options['allowNull'] = formattedModelFieldOptions.allowNull
        if (formattedModelFieldOptions.allowNull === true) options['required'] = false

        options['defaultValue'] = formattedModelFieldOptions.defaultValue

        options['allowBlank'] = originalModelFieldOptions.allowBlank
        options['maxLength'] = originalModelFieldOptions.maxLength
        options['maxDigits'] = originalModelFieldOptions.maxDigits
        options['decimalPlaces'] = originalModelFieldOptions.decimalPlaces

        if (originalModelFieldOptions.autoNow || originalModelFieldOptions.autoAddNow) {
            options['defaultValue'] = new Date()
        }
        return options
    }

    /**
     * As the name suggests, we will create the fields dynamically in the serializers so the user does not need to define it by themselves
     * While on `Serializer` you need to define every field here you just pass a model and the fields you wish to exclude or exclue and the
     * model takes care of the rest.
     * 
     * @param {database/engine/Engine} engineInstance - A engine object instance.
     */
    translateModelToSerializer(engineInstance) {
        if (this.updatedFieldsWithOptions === false) {
            // this will add the existing fields below the ones defined in the model itself. It's a nice touch only for the json formatting
            // if performance is an issue this can definetly be removed.
            const alreadyExistingFields = this.fields
            this.fields = {}
            const model = this.options.model
            const attributeNamesOfModel = Object.keys(model.attributes)
            const modelFormattedAttributes = {}
            const modelFormattedAttributesByFieldName = {}
            const modelFieldsNameBySerializerFields = {}
            
            for (const [modelField, serializerField] of this.modelFieldsToSerializerFields) {
                modelFieldsNameBySerializerFields[modelField.name] = serializerField
            }

            for (const attributeNameOfModel of attributeNamesOfModel) {
                const attributeFormatted = {
                    fieldType: model.attributes[attributeNameOfModel].constructor.name,
                    original: model.attributes[attributeNameOfModel],
                    formatted: engineInstance.getDefaultAttributes(this.options.model.constructor.name, attributeNameOfModel, model.attributes[attributeNameOfModel], model.options)
                }
                modelFormattedAttributes[attributeNameOfModel] = attributeFormatted
                modelFormattedAttributesByFieldName[attributeFormatted.formatted.fieldName] = attributeFormatted
            }
            let fieldNamesToConsiderFromModel = []
            // validate between fields or exclude
            if (this?.options?.fields) {
                for (const fieldName of this.options.fields) {
                    fieldNamesToConsiderFromModel.push(fieldName)
                }
            // used the exclude option
            } else {
                for (const fieldName of [...Object.keys(modelFormattedAttributesByFieldName)]) {
                    if (!this.options.exclude.includes(fieldName) && !fieldNamesToConsiderFromModel.includes(fieldName)) {
                        fieldNamesToConsiderFromModel.push(fieldName)
                    }
                }
            }

            // effectively create the fields. Be aware on how we create the fields. We DO NOT enforce the user
            // to define the fields created in the `field` option in the `fields` parameter inside `options` object.
            // On Django Rest Framework they enforce us that fields defined in the ModelSerializer to be defined
            // in the `fields` option. That's dumb.
            for (const fieldNameToConsider of fieldNamesToConsiderFromModel) {
                const didFieldWasDefined = Object.keys(alreadyExistingFields).includes(fieldNameToConsider)

                let fieldDefinition = modelFormattedAttributesByFieldName[fieldNameToConsider]
                if (fieldDefinition === undefined) {
                    fieldDefinition = modelFormattedAttributes[fieldNameToConsider]
                }
                
                if (didFieldWasDefined) {
                    this.fields[fieldNameToConsider] = alreadyExistingFields[fieldNameToConsider]
                    delete alreadyExistingFields[fieldNameToConsider]
                } else if (fieldDefinition !== undefined) {
                    const translatedAttributes = this.translateAttributes(fieldDefinition.formatted, fieldDefinition.original)
                    this.fields[fieldNameToConsider] = new modelFieldsNameBySerializerFields[fieldDefinition.fieldType](translatedAttributes)
                } else {
                    throw new Error(`'${fieldNameToConsider}' does not exist in model or it was not defined in your serializer.`)
                }
            }
            this.fields = {...this.fields, ...alreadyExistingFields}
            this.updatedFieldsWithOptions === true
        }
    }

    #convertData(data) {
        const engineInstance = getEngineInstance()

        if ([null, undefined].includes(data)) {
            return [engineInstance, data]
        } else {
            let newData = []
            if (this.many) {
                if (Array.isArray(data)) {
                    for (const arrayData of data) {
                        newData.push(engineInstance.convertData(arrayData))
                    }
                }
            } else {
                newData = engineInstance.convertData(data)
            } 

            return [engineInstance, newData]
        }
    }
    async toRepresentation(data, ...args) {
        let engineInstance = null
        if (data === undefined) {
            data = this.instance
        }

        [engineInstance, data] = this.#convertData(data)
        this.validateBasicConfig()
        this.translateModelToSerializer(engineInstance)
        return await super.toRepresentation(data, ...args)
    }

    async toInternal(data, ...args) {
        let engineInstance = null
        if (data === undefined) {
            data = this.internalData
        }

        [engineInstance, data] = this.#convertData(data)
        this.validateBasicConfig()
        this.translateModelToSerializer(engineInstance)
        return await super.toInternal(data, ...args)
    }
}


module.exports = {
    ValidationError,
    ModelSerializer,
    Serializer,
    ...fields
}