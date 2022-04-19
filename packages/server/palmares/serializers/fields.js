const { ValidationError } = require('./errors')
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(customParseFormat)

/**
 * A field represents all fields in Reflow serializers even a serializer itself. This is tightly based on Django Rest Framework, you will view
 * we almost copied everything except for a few changes.
 * 
 * You might ask yourself, why did you create it? Why do you need this? Simple, one of the things i like most about DRF is the possibility to
 * customize and define not just the data we recieve but also the data we send. I know it is less optimized than just send the data directly,
 * we are able to change this in the future, but unless we start having issues with this we can use serializers on how we recieve the data
 * and how we will send the data for the users.
 * 
 * Okay so how does this work? We have to functions that are extremely important: toInternal and toRepresentation.
 * - `toRepresentation()` defines and formats the data we will send for the client. 
 * - `toInternal()` defines and formats the data we recieve from the client. 
 * 
 * Example use cases:
 * ```
 * class ISO8601DateField extends serializers.Field {
 *      toInternal(data) {
 *          if (data instanceof String) {
 *              return new Date(data)
 *          } else {
 *              throw new serializers.ValidationError({reason: 'Should be a String'})
 *          }
 *      }
 *      toRepresentation(data) {
 *          if (data instanceof Date) {
 *              return data.toISOString()
 *          } else {
 *              throw new serializers.ValidationError({reason: 'Should be a Date object'})
 *          }
 *      }
 * }
 * 
 * class ExampleToRepresentation extends serializers.Serializer {
 *      fields = {
 *          customDate: new models.ISO8601DateField()
 *      }
 * }
 * 
 * serializer = new ExampleRepresentation({
 *      instance: {
 *          customDate: new Date()
 *      }
 * })
 * 
 * serializer.toRepresentation()
 * ```
 * 
 * this will convert the instance data to a way you want to represent. This way, customDate date object will be converted to a string.
 * See that in the toRepresentation method we already do all of the validation needed to represent the value.
 * 
 * This works similarly the other way around, when we want to convert data recieved from the user
 * 
 * @param {String} [source=null] - Source is used to get the value of a nested json without needing to retrieve the hole json.
 * For example suppose that we have
 * {
 *      company: {
 *          user: {
 *              username: 'nicolasmelo',
 *              fullName: 'Nicolas Leal de melo'
 *          }
 *      }
 * }
 * 
 * how we represent if we only want to retrieve the username of the user?
 * 
 * like this:
 * 
 * class CompanySerializer extends serializers.Serializer {
 *      fields = {
 *          username: new serializers.CharField({source: 'user.username'})
 *      }
 * }
 * 
 * class ExampleSerializer extends serializers.Serializer {
 *      fields = {
 *          company: new CompanySerializer()
 *      }
 * }
 * 
 * By doing this the representation of the object in the example above will be:
 * {
 *      company: {
 *          username: 'nicolasmelo'
 *      }
 * }
 * 
 * So by defining a source we can transverse nested objects.
 * 
 * @param {boolean} [required=true] - Is the field required or not?
 * @param {*} [defaultValue=undefined] - The default value of the field, this default value will only be used
 * if source is not defined and if the value passed is undefined.
 * @param {boolean} [allowNull=false] - Is null a valid value?
 * @param {boolean} [readOnly=false] - The value is only supposed to be read and not supposed to write.
 * @param {boolean} [writeOnly=false] - The value is only supposed to write and not to read from.
 * @param {object} [errorMessages={}] - You can override all the error messages if you want, just check the key of each error message
 * and pass a object with the each key you want to override and the error message you want to display.
 */
class Field {
    constructor({
        source=null, required=true, defaultValue=undefined, allowNull=false,
        readOnly=false, writeOnly=false, errorMessages={}} = {}
    ) {
        const defaultErrorMessages = {
            required: 'The field is required.',
            null: 'The field cannot be null.'
        }

        this._fieldName = ''
        this._userErrorMessages = errorMessages
        this.errorMessages = {
            ...defaultErrorMessages,
            ...this._userErrorMessages
        }
        this.source = source
        this.required = required
        this.defaultValue = defaultValue
        this.allowNull = allowNull
        this.readOnly = readOnly
        this.writeOnly = writeOnly
        this.context = {}
    }

    /**
     * Throws a validation error that the data you are sending is invalid in some way.
     */
    fail(errorKey) {
        throw new ValidationError({fieldName: this._fieldName, errorKey: errorKey, reason: this.errorMessages[errorKey]})
    }

    /**
     * Used for retrieving nested objects as values.
     * This is explained better in the class definition.
     */
    _getSource(instance) {
        let newInstance = {...instance}
        if (this.source !== null && this.writeOnly === false) {
            if (this.source === '*') {
                return newInstance
            } else {
                const attributes = this.source.split('.')
                for (const attribute of attributes) {
                    if (Object.keys(newInstance).includes(attribute)) {
                        newInstance = newInstance[attribute]
                    } else {
                        throw new Error(`The source '${this.source}' is invalid because we could not find '${attribute}' in the object passed`)
                    }
                }
                return newInstance
            }
        }
    }

    /**
     * if it has a default value we use this instead of the undefined value. The default value is only used if the retrieved value is 
     * not null, then we don't use the default value. Also the default value needs to exist. This will bypass the `required` parameter
     * but not `allowNull` if the `defaulfValue` is null.
     * 
     * @param {Any} data - The actual data recieved from either `toRepresentation` or `toInternal`
     * 
     * @returns {Any} - Returns the data, can be of any type, it depends on the data recieved or the `defaultValue`` provided
     */
    setDefaultValue(data) {
        if (data === undefined && this.defaultValue !== undefined) data = this.defaultValue
        return data
    }

    /**
     * This is responsible for handling how the data of the field is represented for the client, this is not the data
     * that is coming from the user but instead the data that you want to send for the client. For example
     * a DateTimeField will not be represented as an String but instead with a ISO8601 formatting.
     * 
     * This is async because sometime you might want to override this to change the data before displaying and for that you 
     * might wanna make database queries or make async requests, by that this can be used. 
     * 
     * @param {Any} data - The actual data recieved to be represented to.
     * 
     * @returns {Any} - How the data will be represented in the JSON response.
     */
    async toRepresentation(data, ...args) {
        if (data === undefined && this.required && this.writeOnly === false) this.fail('required')

        return data
    }

    /**
     * This is the complete oposite from `toRepresentation`, the idea here is how data is represented
     * to the internal value. Remember the ISO8601 string that we represented? Internally, ISO8601 is still
     * a string, so we need to convert it to a date object.
     * 
     * toInternal also handles validation of the data.
     * 
     * @param {Any} data - The data coming from the client for each field/serializer.
     * 
     * @returns {Any} - How the data is represented to our application.
     */
    async toInternal(data, ...args) {
        if (data === undefined && this.required && this.readOnly === false) this.fail('required')
        if (data === undefined && this.required === true) this.fail('required')
        if (data === null && !this.allowNull) this.fail('null')
        if (this.validate && typeof this.validate === 'function') await this.validate(data, ...args)
        return data
    }
}

/**
 * This field is responsible for handling boolean values, boolean values can be defined by the
 * arguments`trueValues` and `falseValues`, both are Arrays that recieves a number of options that
 * can be accepted as true values and as false values.
 * 
 * So when we recieve a value that is in the `trueValues` list we will convert this value to true, 
 * for false values, if we recieve a value that is in the `falseValues` array we will convert the value to
 * false.
 * 
 * @param {Array<Any>} trueValues - The values to be considered as true when making the conversion
 * @param {Array<Any>} falseValues - The values to be considered as false when making the conversion
 */
class BooleanField extends Field {
    constructor ({trueValues=[true, 'true', 'True', 1], falseValues=[false, 'False','false', 0], ...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Not a valid boolean',
            ...this._userErrorMessages
        }
        this.trueValues = trueValues
        this.falseValues = falseValues
    }

    /**
     * To represent the value of the BooleanField we use the `trueValues` and
     * `falseValues` attributes when initilizing the class. 
     * 
     * At the end we will use the boolean constructor to get the boolean value of the 
     * data recieved
     * 
     * Reference: https://stackoverflow.com/a/264037
     * 
     * @param {*} data - The actual data recieved to be represented to.
     * 
     * @returns {boolean | null} - Can return either null, or true or false.
     */
    async toRepresentation(data, ...args) {
        data = await super.toRepresentation(data, ...args)
        if (this.trueValues.includes(data)) return true
        if (this.falseValues.includes(data)) return false
        if (data === null || data === undefined) return null
        return data === 'true'
    }

    /**
     * To intenalizing the value of the BooleanField we use the `trueValues` and
     * `falseValues` attributes when initilizing the class. 
     * 
     * At the end if we cannot convert the data recieved we will throw an error 
     * that the data recieved is invalid.
     * 
     * @param {*} data - The actual data recieved from the client to be internalized.
     * 
     * @returns {boolean | null} - Can return either null (if allowNull is defined), or true or false.
     */
    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)

        if (this.trueValues.includes(data)) return true
        if (this.falseValues.includes(data)) return false
        if ((data === null || data === undefined) && this.allowNull) return null

        this.fail('invalid')
    }
}

/**
 * Validates all types of string, from max and min lengths to infinite length.
 * 
 * @extends Field
 * 
 * @param {Boolean} allowBlank - Allow blank strings
 * @param {null | number} maxLength - Allow strings no more to a maximum length
 * @param {null | number} minLength - Allow strings no more to a minimum length
 */
class CharField extends Field {
    constructor ({allowBlank=false, maxLength=null, minLength=null,...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Not a valid string',
            maxLength: `Make sure this field is not logger than ${maxLength} character(s) long.`,
            minLength: `Make sure this field is at least ${minLength} character(s) long.`,
            blank: 'The field cannot be blank',
            ...this._userErrorMessages
        }
        this.allowBlank = allowBlank
        this.maxLength = maxLength
        this.minLength = minLength
    }

    /**
     * Validate if the data recieved is a string, if it is it passes, if not, it throws an error saying 
     * that the data recieved is not valid.
     * 
     * @param {Any} data - Should recieve a string, if it is not a string it throws an error. 
     */
    async validate(data, ...args) {
        if (data === null) return null
        if (typeof data !== 'string') this.fail('invalid')
        if (this.maxLength && data.length > this.maxLength) this.fail('maxLength')
        if (this.minLength && data.length < this.minLength) this.fail('maxLength')
        if (this.allowBlank && data === '') this.fail('blank')
    }

    /**
     * Validates if the input is a string while also validating the mininum and maximum length
     * of the string if it was defined. Also validates the allowBlank options for blank/empty strings
     * 
     * @param {Any} data - The data recieved by the client.
     *  
     * @returns {String} - returns the value recieved as a string if it passes all of the validations, but to guarantee it is 
     * a string we use the `.toString()` function on the object.
     */
    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)
        if (data === null) return null
        return data.toString()
    }

    /**
     * This doesn't do any prior validation to represent the data to the end user but 
     * since that every data that passes here is an object of some sort, then we convert
     * it to a string using the `toString()` method, always.
     * 
     * @param {Any} data - The data recieved to be represented to the end user.
     * 
     * @returns {String} - We represent all data that we recieve as a string.
     */
    async toRepresentation(data, ...args) {
        data = await super.toRepresentation(data, ...args)
        if (data !== null && data !== undefined) return data.toString()
        return data
    }
}

/**
 * Similar to CharField, except this will have a special validation for emails.
 * 
 * @extends CharField  
 */
class EmailField extends CharField {
    constructor(options={}) {
        super(options)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Not a valid email address',
            ...this._userErrorMessages
        }
    }

    /**
     * Makes the validation needed for emails, this is a simple regex validation
     * that only validates if the string has a `@` character following of a `.` character.
     * 
     * @param {String} data - Hopefully will recieve a string, if a string is not recieved than it will fail.
     */
    async validate(data, ...args) {
        if (/\S+@\S+\.\S+/.test(data) === false) this.fail('invalid')
    }
}

/**
 * A UUIDField specific for validating uuid, we do not do any conversion here.
 * 
 * @augments Field
 * 
 * @param {Array<('v1' | 'v2' | 'v3' | 'v4' | 'v5')>} versions - THe versions of valid uuids, a version not 
 * specified here will not be validated
 */
class UUIDField extends Field {
    constructor({versions=['v1', 'v2', 'v3', 'v4', 'v5'], ...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Not a valid uuid address',
            ...this._userErrorMessages
        }
        this.regexesByVersion = {
            v1: /^[0-9A-F]{8}-[0-9A-F]{4}-[1][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
            v2: /^[0-9A-F]{8}-[0-9A-F]{4}-[2][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
            v3: /^[0-9A-F]{8}-[0-9A-F]{4}-[3][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
            v4: /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
            v5: /^[0-9A-F]{8}-[0-9A-F]{4}-[5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        }
        this.versions = versions
    }

    /**
     * Validates if the uuid recieved is valid, first it verifies if the data recieved is a string, 
     * it must be a string and then it verify if it matches one of the selected versions of uuid to verify.
     * 
     * @param {Any} data - The type should be a string, if it is not a string it will fail.
     */
    async validate(data, ...args) {
        if (typeof data !== 'string') this.fail('invalid')
        if (this.versions.some(version => this.regexesByVersion[version].test(data)) === false) this.fail('invalid')
    }
}

/**
 * The IntegerField is used for validating integers, integers are numbers that cannot contain any decimal value.
 * For representing values this Field will only accept numbers, if you send a value for representation in this field 
 * type that IS NOT a number then it will fail.
 * 
 * @augments Field
 * 
 * @param {number | null} maxValue - Checks if the value is bigger than this defined max value, if it is then it will fail.
 * if it is null this verification will not be considered
 * @param {number | null} minValue - Checks if the value is less than this defined min value, if it is then it will fail.
 * if it is null this verification will not be considered
 */
class IntegerField extends Field {
    constructor({maxValue=null, minValue=null, ...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Invalid integer field.',
            maxValue: `Ensure this value is less than or equal to ${maxValue}.`,
            minValue: `Ensure this value is greater than or equal to ${minValue}.`,
            ...this._userErrorMessages
        }
        this.maxValue = maxValue
        this.minValue = minValue
    }

    /**
     * We validate things that are coming inside or things that are going out of it
     * to check if it is a number, if it is not a number it will fail, it doesn't matter
     * if it's for the client, it will fail.
     * 
     * @param {Any} data - Checks if the data recieved is a number, if it's not a number than it will fail.
     */
    async validate(data, ...args) {
        if (data === null) return
        if (isNaN(data)!==false) this.fail('invalid')
    }

    /**
     * As said before, even when we want to represent the data to external user we need to validate
     * if the value recieved is a number, that is because we use the BigInt method. If the value
     * was not a number then the BigInt function would fail and the user would not understand why it failed.
     * So we just validate this before converting the value.
     * 
     * @param {Any} data - Hopefully an integer that is recieved by the programmer to send for the client.
     * 
     * @returns {BigInt} - Returns an integer for the client.
     */
    async toRepresentation(data, ...args) {
        data = await super.toRepresentation(data, ...args)
        if (data === null) return null
        await this.validate(data, ...args)
        
        return parseInt(data)
    }

    /**
     * Validates if the max and minimum values are respected if they are not null.
     * Otherwise just parses the value to an integer.
     * 
     * @param {Any} data - Hopefully will recieve a number or at least a string of numbers.
     * 
     * @returns {BigInt} - Returns a bigInt so we are able to represent big numbers recieved.
     */
    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)
        if (data === null) return null
        if (this.maxValue !== null && data > this.maxValue) this.fail('maxValue')
        if (this.minValue !== null && data < this.minValue) this.fail('minValue')
        return data
    }
}

/**
 * Basically the same as `IntegerField` except that we parse the value to a float instead of a integer.
 * 
 * Since it is basically a `IntegerField` it can be more dynamic and fit more use cases than the plain `IntegerField`
 * 
 * @augments Field
 * 
 * @param {number} [maxValue=null] - The max value the data can be
 * @param {number} [minValue=null] - The minimum value the data can be
 */
class FloatField extends Field {
    constructor({maxValue=null, minValue=null, ...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Invalid float field.',
            maxValue: `Ensure this value is less than or equal to ${maxValue}.`,
            minValue: `Ensure this value is greater than or equal to ${minValue}.`,
            ...this._userErrorMessages
        }
        this.maxValue = maxValue
        this.minValue = minValue
    }

    /**
     * We validate things that are coming inside or things that are going out of it
     * to check if it is a number, if it is not a number it will fail, it doesn't matter
     * if it's for the client, it will fail.
     * 
     * @param {Any} data - Checks if the data recieved is a number, if it's not a number than it will fail.
     */
    async validate(data, ...args) {
        if (isNaN(data) !== false) this.fail('invalid')
    }

    /**
     * As said before, even when we want to represent the data to external user we need to validate
     * if the value recieved is a number, that is because we use the parseFloat method. If the value
     * was not a number then the parseFloat function would fail and the user would not understand why it failed.
     * So we just validate this before converting the value.
     * 
     * @param {Any} data - Hopefully an number that is recieved by the programmer to send for the client.
     * 
     * @returns {number} - Returns a float number for the client.
     */
    async toRepresentation(data,...args) {
        data = await super.toRepresentation(data, ...args)
        await this.validate(data,...args)

        return parseFloat(data)
    }

    /**
     * Validates if the max and minimum values are respected if they are not null.
     * Otherwise just parses the value to a float.
     * 
     * @param {Any} data - Hopefully will recieve a number or at least a string of numbers.
     * 
     * @returns {number} - Returns a float number.
     */
    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)
        data = parseFloat(data)
        if (this.maxValue !== null && data > this.maxValue) this.fail('maxValue')
        if (this.minValue !== null && data < this.minValue) this.fail('minValue')
        return data
    }
}

/**
 * Used for decimal values, but you might think: hey, what's the difference between a float.
 * 
 * This was actully inspired by django, but database have a different representation from decimal and floats
 * floats have decimals without limit while decimal has a limited length in size and also a limited length in
 * decimal places.
 * 
 * @extends Field
 * 
 * @param {number} maxDigits - The maximum number of values counting the decimals and the integers of the number.
 * for a number of 1234.56 the maxDigits is 6 because (without the .) we have 6 numbers.
 * @param {number} decimalPlaces - The maximum number of decimal places the number can have. For example for the number
 * 123.56 the number of decimal places is 2, but for the number 123.456 the number of decimal places is 3.
 * @param {number | null} [maxValue=null] - The maximum value this number can be.
 * @param {number | null} [minValue=null] - The minimum value this number can be.
 * @param {Boolean} [castAsString=false] - cast the representated value as a string, by default the value in the json will
 * be a number, but you might want to cast as string. When casting as string you can force the decimal places like '2.00', 
 * when it is not casted as string the same number will be displayed as '2'.
 */
class DecimalField extends Field {
    constructor({maxDigits, decimalPlaces, maxValue=null, minValue=null, castAsString=false,  ...rest} = {}) {
        super(rest)

        if (maxDigits === undefined || typeof maxDigits !== 'number') throw new Error('`maxDigits` option is required for DecimalField and/or should be a number')
        if (decimalPlaces === undefined || typeof maxDigits !== 'number') throw new Error('`decimalPlaces` option is required for DecimalField and/or should be a number')

        this.errorMessages = {
            ...this.errorMessages,
            invalid: 'Invalid decimal field.',
            maxValue: `Ensure this value is less than or equal to ${maxValue}.`,
            minValue: `Ensure this value is greater than or equal to ${minValue}.`,
            maxDigits: `Ensure that there are no more than ${maxDigits} digits in total.`,
            decimalPlaces: `Ensure that there are no more than ${decimalPlaces} decimal places (maximum of ${decimalPlaces} values after the '.').`,
            ...this._userErrorMessages
        }
        this.castAsString = castAsString
        this.maxDigits = maxDigits
        this.decimalPlaces = decimalPlaces
        this.maxValue = maxValue
        this.minValue = minValue
    }

    /**
     * Validates the decimal field, first same as always, validates if the number is number otherwise throw an error.
     * Then we validate the max digits of the decimal field, this is explained in the class documentation.
     * Last but not least we validate the decimalPlaces that the number can have. For both validation we convert
     * the number to a string and strip the '.'
     * Then we also validate the maxValue and minValue attributes so we do not accept any value above a maxValue and
     * below a minValue.
     * 
     * @param {Any} data - Must be a number, if it is not a number then throws an error. 
     */
    async validate(data, ...args) {
        if (isNaN(data) !== false) this.fail('invalid')
        if (data.toString().replace('.', '').length > this.maxDigits) this.fail('maxDigits')
        if (data.toString().split('.').length > 0 && data.toString().split('.')[1].length > this.decimalPlaces) this.fail('decimalPlaces')
        if (this.maxValue !== null && parseFloat(data) > this.maxValue) this.fail('maxValue')
        if (this.minValue !== null && parseFloat(data) < this.minValue) this.fail('minValue')
    }
    
    /**
     * To representation we return two values: if this.castAsString is defined
     * we will use `toFixed()` function https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed
     * otherwise we just parse the number as a float, if it has no decimal places, or the decimal places are '0' then
     * it will not appear in the number
     * 
     * @param {Any} data - Must be a number, if it is not a number then throws an error. 
     * 
     * @returns {string | number} - returns a String if `castAsString` is defined and a number if not.
     */
    async toRepresentation(data, ...args) {
        data = await super.toRepresentation(data, ...args)
        if (isNaN(data) !== false) this.fail('invalid')
        
        // if cast as string the output will be a string with the decimals, otherwise it will be just a normal Float number.
        if (this.castAsString) {
            return parseFloat(data).toFixed(this.decimalPlaces)
        } else {
            return parseFloat(data)
        }
    }

    /**
     * To representation use `validate` method and then also validates.
     * Last but not least convert the data to float before returning to the user.
     * 
     * @param {Any} data - Hopefully a number, needs to be a valid number.
     * 
     * @returns {number} - Returns the number parsed as a float.
     */
    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)
        return parseFloat(data)
    }
}

/**
 * 
 */
class DateTimeField extends Field {
    constructor({format='YYYY-MM-DDTHH:mm:ss.SSSZ', inputFormats=[], timezone=null,  ...rest} = {}) {
        super(rest)
        this.inputFormats = Array.isArray(inputFormats) && inputFormats.length > 0 ? inputFormats : [format]
        this.errorMessages = {
            ...this.errorMessages,
            invalid: `Datetime has wrong format. Use one of these formats instead: ${this.inputFormats.join(', ')}.`,
            ...this._userErrorMessages
        }
        this.format = format
        this.timezone = timezone
    }

    async toRepresentation(data, ...args) {
        data = await super.toRepresentation(data, ...args)
        if (typeof data === 'string') data = dayjs(data, this.format).toDate()
        if (Object.prototype.toString.call(data) !== '[object Date]') this.fail('invalid')
        data = dayjs(data)
        if (this.timezone !== null) {
            data = data.tz(this.timezone)
        }
        return data.format(this.format)
    }

    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)
        // the default value can be a Date object so we conver to a dayjs date and then to the desired formatting.
        if (Object.prototype.toString.call(data) === '[object Date]') {
            data = dayjs(data).format(this.format)
        }

        let hasFoundAValidDate = false

        for (const inputFormat of this.inputFormats) {
            // reference: https://day.js.org/docs/en/parse/string-format
            const dayJsDate = dayjs(data, inputFormat, true)
            if (dayJsDate.isValid()) {
                hasFoundAValidDate = true
                data = dayJsDate.toDate()
                break
            }
        }
        if (!hasFoundAValidDate) {
            this.fail('invalid')
        } else {
            return data
        }
    }
}

class DateField extends DateTimeField {
    constructor({format='YYYY-MM-DD', ...rest} = {}) {
        super({format: format, ...rest})
        this.errorMessages = {
            ...this.errorMessages,
            invalid: `Date has wrong format. Use one of these formats instead: ${format}.`,
            ...this._userErrorMessages
        }
    }
}

class TimeField extends DateTimeField {
    constructor({format='HH:mm:ss', inputFormats=[], ...rest} = {}) {
        inputFormats = Array.isArray(inputFormats) && inputFormats.length > 0 ? inputFormats : [format, 'HH:mm']
        super({format: format, inputFormats: inputFormats, ...rest})
        this.errorMessages = {
            ...this.errorMessages,
            invalid: `Time has wrong format. Use one of these formats instead: ${format}.`,
            ...this._userErrorMessages
        }
    }
}

class ChoiceField extends Field {
    constructor({choices, allowBlank=false, isMultiple=false, ...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: `Not a valid choice, use one of the following: ${choices}`,
            justOne: `Can select just one choice not multiple, for that you should use 'isMultiple' parameter`,
            multipleChoices: `Expected an array`,
            blank: 'The field cannot be blank',
            ...this._userErrorMessages
        }
        this.allowBlank = allowBlank
        this.choices = choices
        this.isMultiple = isMultiple
    }

    async validate(data, ...args) {
        if (this.isMultiple !== false && Array.isArray(data) === false) this.fail('multipleChoices')
        if (this.isMultiple === false && Array.isArray(data) === true) this.fail('justOne')
        if (this.isMultiple === false && this.allowBlank === false && data === '') this.fail('blank')
        if (this.isMultiple === false && this.choices.includes(data) === false) this.fail('invalid')
    }
}


class ArrayField extends Field {
    constructor({child, allowEmpty=true, maxLength=null, minLength=null, ...rest} = {}) {
        super(rest)
        this.errorMessages = {
            ...this.errorMessages,
            invalid: `Expected an array but got another type.`,
            empty: `The list cannot be empty.`,
            minLength: `Ensure this field has at least ${minLength} elements.`,
            maxLength: `Ensure this field has no more than ${maxLength} elements.`,
            ...this._userErrorMessages
        }
        if (child === undefined) throw new Error(`'child' argument must be declared.`)
        if (child.source !== null) throw new Error('The `source` argument is not meaningful when applied to a `child:` field. Remove `source:` from the field declaration.')
        this.child = child
        this.allowEmpty = allowEmpty
        this.maxLength = maxLength
        this.minLength = minLength
    }

    async validate(data, ...args) {
        if (Array.isArray(data) === false) this.fail('invalid')
        if (this.maxLength !== null && data.length > this.maxLength) this.fail('maxLength')
        if (data.allowEmpty === false && data.length === 0) this.fail('empty')
        if (this.minLength !== null && data.length < this.minLength) this.fail('minLength') 
    }

    async toInternal(data, ...args) {
        data = await super.toInternal(data, ...args)
        let internal = []
        for (const element of data) {
            internal.push(await this.child.toInternal(element))
        }
        return internal
    }
    async toRepresentation(data, ...args) {
        data = await super.toRepresentation(data, ...args)

        if (Array.isArray(data) === false) this.fail('invalid')
        let representation = []
        for (const element of data) {
            representation.push(await this.child.toRepresentation(element))
        }
        return representation
    }
}

/** 
 * This is mostly used for recursion, really simple to use. Sometimes when you need to define a field recursively it's not
 * easy to do so. In Palmares it is easy. 
 * 
 * The idea is that you send a field/serializer class that you want to use recursively and then defines the parameters normally.
 * we will pass the parameters to the child when it's being represented to the internal value or to the end user.
 */
class LazyField extends Field {
    /**
     * @param {class/function} field - The class or function that will be used to create a new field.
     * All other parameters are passed normally here.
     */
    constructor({field,...rest} = {}) {
        super(rest)
        this.field = field
        this._options = rest
    }

    async toRepresentation(data, ...args) {
        const initializedField = new this.field({...this._options})
        return await initializedField.toRepresentation(data, ...args)
    }

    async toInternal(data, ...args) {
        const initializedField = new this.field({...this._options})
        return await initializedField.toInternal(data, ...args)
    }
}

module.exports = {
    Field,
    BooleanField,
    CharField,
    EmailField,
    UUIDField,
    IntegerField,
    FloatField,
    DecimalField,
    DateTimeField,
    DateField,
    TimeField,
    ChoiceField,
    ArrayField,
    LazyField
}