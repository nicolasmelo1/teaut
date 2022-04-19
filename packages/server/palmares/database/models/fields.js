class InvalidOnDeleteError extends Error {}
class InvalidRelationError extends Error {}

const ON_DELETE = {
    CASCADE: 'cascade',
    SET_NULL: 'set_null',
    SET_DEFAULT: 'set_default',
    DO_NOTHING: 'do_nothing',
    RESTRICT: 'restrict'
}

/**
 * Every new field should be defined by it, this class is used as the base class for all fields
 * 
 * The idea is simple, by that we create a simple and shallow interface for creating models. This way
 * whatever ORM you are using, can be TypeORM, Prisma or Sequelize or even Knex, you will create an engine
 * for those orms and you will translate the options from this field to those ORMs.
 * 
 * If you want to interact directly with the ORM you can use the customAttributes, this way you will be defining the attributes directly with the ORM
 * for example, in Sequelize we have set() and get() functions, you can define them in the custom attributes object.
 * 
 * I DO NOT RECOMMEND USING CUSTOM ATTRIBUTES UNLESS ABSOLUTELY NECESSARY, BECAUSE THIS WILL LOCK YOU TO AN ORM.
 * 
 * `dbIndex` - Will create an index for this column
 * `unique` - Is it unique or not? Creates a unique index.
 * `underscored` - Will convert the databaseName to underscored.
 * `primaryKey` - Transforms the column to a primary key, only one column per table, be sure to check autoId to false in your `options`
 * setting
 * `allowNull` - Allow the value in the column to be null
 * `databaseName` - The name of the column in the database, it overides the underscored, if not defined we create one, this is created
 * from the name of the attribute in your model.
 * `defaultValue` - The default value to use in the table.
 */
class Field {
    constructor({
        primaryKey=false, defaultValue=undefined, allowNull=false, unique=false, allowBlank=true,
        dbIndex=false, databaseName=null, underscored=true, customAttributes={}
    }={}) {
        this.underscored = underscored
        this.primaryKey = primaryKey
        this.defaultValue = defaultValue
        this.allowBlank = allowBlank
        this.allowNull = allowNull
        this.unique = unique
        this.dbIndex = dbIndex
        this.databaseName = databaseName
        this.customAttributes = customAttributes
        this.attributeName = ''
    }

    /** 
     * Called on the model initialization to append the model data like the name of the attribute this field is defined on 
     * onto the field. This handles the basic stuff in initialization that is defining the databaseName based on this
     * attribute name provided, this is total responsability from the field itself and not the model
     */
    initialize() {
        const { camelToSnakeCase } = require('../helpers')
        if(this.databaseName === null && this.underscored === false) {
            this.databaseName = this.attributeName
        } else if (this.databaseName === null && this.underscored === true) {
            this.databaseName = camelToSnakeCase(this.attributeName)
        }
    }
}


class TextField extends Field {
    constructor({allowBlank=true, ...rest}={}) {
        super({...rest})
        this.allowBlank = allowBlank
    }
}

class CharField extends Field {
    constructor({maxLength=280, allowBlank=false, ...rest}={}) {
        super({...rest})
        this.allowBlank = allowBlank
        this.maxLength = maxLength
    }
}

class AutoField extends Field {
    constructor({...rest}={}) {
        super({...rest, primaryKey: true})
    }
}

class BigAutoField extends Field {
    constructor({...rest}={}) {
        super({...rest, primaryKey: true})
    }
}

class IntegerField extends Field {}

class BigIntegerField extends Field {}

class DecimalField extends Field {
    constructor({maxDigits=null, decimalPlaces=null, ...rest}={}) {
        super({...rest})
        this.maxDigits = maxDigits
        this.decimalPlaces = decimalPlaces
    }
}

class BooleanField extends Field {}

class DateField extends Field {
    constructor({autoNow=false, autoNowAdd=false, ...rest}={}) {
        super({...rest})
        this.autoNow = autoNow
        this.autoNowAdd = autoNowAdd
    }
}

class DatetimeField extends Field {
    constructor({autoNow=false, autoNowAdd=false, ...rest}={}) {
        super({...rest})
        this.autoNow = autoNow
        this.autoNowAdd = autoNowAdd
    }
}

class TimeField extends Field {
    constructor({autoNow=false, autoNowAdd=false, ...rest}={}) {
        super({...rest})
        this.autoNow = autoNow
        this.autoNowAdd = autoNowAdd
    }
}

class JSONField extends Field {}

class UUIDField extends CharField {
    constructor({autoGenerate=false,...rest} = {}) {
        super({maxLength: 36, ...rest})
        this.autoGenerate = false
    }
}

class ForeignKeyField extends Field {
    constructor({relatedTo, onDelete, fieldName=null, relatedName=null, toField=null, ...rest}={}) {
        super({...rest})
        if (!Object.values(ON_DELETE).includes(onDelete)) {
            throw new InvalidOnDeleteError(`You must define the onDelete attribute by using 'models.ON_DELETE' with one of the following options: ${Object.keys(ON_DELETE).join(', ')}`)
        }

        if (
            (relatedTo instanceof Function && Object.getPrototypeOf(relatedTo).name !== 'Model') || 
            ((relatedTo instanceof Function) === false && typeof relatedTo !== 'string')
        ) {
            throw new InvalidRelationError(`The relatedTo parameter must be a string with the name of your model or the actual model itself`)
        }

        if (relatedTo instanceof Function && Object.getPrototypeOf(relatedTo).name === 'Model') {
            this.relatedTo = relatedTo.name
        } else {
            this.relatedTo = relatedTo
        }
        this.fieldName = fieldName
        this.onDelete = onDelete
        this.relatedName = relatedName
        this.toField = toField
    }

    initialize() {
        const { camelToSnakeCase } = require('../helpers')

        if (this.fieldName === null) {
            this.fieldName = `${this.attributeName}Id`
        }

        if(this.databaseName === null && this.underscored === false) {
            this.databaseName = this.fieldName
        } else if (this.databaseName === null && this.underscored === true) {
            this.databaseName = camelToSnakeCase(this.fieldName)
        }
    }
}

class OneToOneField extends ForeignKeyField {
    constructor(options={}) {
        super({...options, unique: true})
    }
}

module.exports = {
    InvalidOnDeleteError,
    InvalidRelationError,
    ON_DELETE,
    Field,
    OneToOneField,
    ForeignKeyField,
    UUIDField,
    TimeField,
    JSONField,
    DecimalField,
    DatetimeField,
    DateField,
    BooleanField,
    BigIntegerField,
    IntegerField,
    BigAutoField,
    AutoField,
    CharField,
    TextField
}