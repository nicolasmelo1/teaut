const FlowError = require('../builtins/objects/error')
const errorTypes = require('../builtins/errorTypes')

/**
 * As you probably have guessed, on Memory you will see an explanation on how the CallStack works.
 * But you might ask yourself. Okay, but what are each row?
 * 
 * Each row is called a record. a Record is exactly this class.
 * 
 * It have a name and a type, is it a function? Is it a method? Is it the program?
 * And the name is the name of the function, or program, or whatever. It is just an identifier.
 * 
 * Besides that you will see we have 'members', what are those?
 * Members is exactly the variables, this is where we save the Objects of inside of the flow memory.
 * 
 * IMPORTANT: When you create a new record, you probably will want to make the variables from the previous record available on the next
 * for example:
 * ```
 * m = 10
 * function teste() do
 *      function teste2() do
 *          m = 2
 *      end
 * end
 * 
 * teste()()
 * m
 * ```
 * 
 * 'm' was defined outside of both teste and teste2 functions, but besides that the variable `m` should be available inside of the teste2 function. 
 * 
 * For that we use the handy. `appendRecords()` method. This method will copy the variables from the given record to the CURRENT record. (The current record is 
 * the one that is being called). We do not copy the variables directly, we just create a reference to the old record. This means that in this case above
 * the variable `m` at the end will hold the value of `2` and not 10. Because although we defined inside of the outer scope, it's still available in the inner scope
 * and the value will change if we change it.
 * 
 * This is the expected behaviour in most languages like javascript, python, elixir and others.
 */
class Record {
    constructor(settings, name, recordType) {
        this.settings = settings
        this.name = name
        /** 
         * @type {boolean} - If it's true, this means that we cannot assign no new variables to the scope. 
         * Don't forget to unlock after locking the assignment.
         */
        this.lockAssignmentInScope = false
        this.recordType = recordType
        this.nestingLevel = 0
        this.members = {}
    }

    /**
     * This function will pass all of the variables from an outer scope to the current scope so they are available in the current scope.
     * 
     * When you create a new record, you probably will want to make the variables from the previous record available on the next
     * for example:
     * ```
     * m = 10
     * function teste() do
     *      function teste2() do
     *          m = 2
     *      end
     * end
     * 
     * teste()()
     * m
     * ```
     * 
     * 'm' was defined outside of both teste and teste2 functions, but besides that the variable `m` should be available inside of the teste2 function. 
     * 
     * For that we use the handy. `appendRecords()` method. This method will copy the variables from the given record to the CURRENT record. (The current record is 
     * the one that is being called). We do not copy the variables directly, we just create a reference to the old record. This means that in this case above
     * the variable `m` at the end will hold the value of `2` and not 10. Because although we defined inside of the outer scope, it's still available in the inner scope
     * and the value will change if we change it.
     * 
     * This is the expected behaviour in most languages like javascript, python, elixir and others.
     * 
     * @param {Record} record - The record to append to the current one.
     */
    async appendRecords(record) {
        for (const memberName of Object.keys(record.members)) {
            if (record.members[memberName] instanceof Record) {
                this.members[memberName] = record.members[memberName]
            } else {
                this.members[memberName] = record
            }
        }
    }
    
    /**
     * Assigns a new variable with a key, we are storing it in a dict, in other words: Be aware, we can have
     * ONE and ONLY ONE variable with an identifier name.
     * 
     * In this example:
     * ```
     * value = 2
     * ```
     * 
     * the key is 'value'. And the value is a reflow_server.formula.utils.builtins.objects.Integer.Integer
     * object.
     * 
     * Sometimes the value already exists, and it references another record, so we update the value from this other record.
     * 
     * @param {string} key - The key to save this variable to.  
     * @param {import('../builtins/objects/object')} value - One of the builtin objects generally.
     */
    async assign(key, value) {
        if (this.lockAssignmentInScope === false) {
            if (this.members[key] instanceof Record) {
                await this.members[key].assign(key, value)
            } else {
                this.members[key] = value
            }
        }
    }

    /**
     * Retrieves the variable data. From this example:
     * ```
     * value = 2
     * value
     * ```
     * 
     * When we do 'value' we actually are referencing to the value 2.
     * 
     * Sometimes the value references another record, so we get the value from this other record.
     * 
     * @param {string} key - The key you want to retrieve. This is the name of the variable. Be aware that the names should be unique, so
     * if you assign the value again you will loose the reference to the old value.
     * 
     * @returns {Promise<import('../builtins/objects/object')>} - The saved value inside of the variable.
     */
    async get(key) {
        if (this.members[key] === undefined) {
            await FlowError.new(this.settings, errorTypes.NAME_ERROR, `'${key}' was not defined.`)
        } else if (this.members[key] instanceof Record) {
            return await this.members[key].get(key)
        } else {
            return this.members[key]
        }
    }

    /**
     * Sets the nesting level of this record, the nesting level means, in which level of the call stack this record is.
     */
    async setNestingLevel(nestingLevel) {
        this.nestingLevel = nestingLevel
    }

    async getNestingLevel() {
        return this.nestingLevel
    }
}

module.exports = Record