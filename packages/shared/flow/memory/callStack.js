const FlowError = require('../builtins/objects/error')
const errorTypes = require('../builtins/errorTypes')
const Record = require('./record')

/**
 * This is explained better in Memory class so read it ther before continuing here.
 * 
 * This holds all of the records and it is simple as this. It's just a list that we will use to hold all of the records.
 * Each record represent a list that is currently being executed.
 */
class CallStack {
    constructor(settings) {
        this.settings = settings
        this.records = []
    }

    /**
     * Simple helper method to create a new record. This will return the record directly so you can assign the variables
     * before actually pushing it to the stack.
     * 
     * A record, as you already might know, is a place where we will use to store variables. It is a simple hashmap where 
     * each key is the name of the variable and the value is the value of the variable. Really simple stuff.
     * 
     * @param {string} name - The name of the record that is being created, this can have the name of the function or the name
     * of the module.
     * @param {'PROGRAM' | 'CATCH' | 'FUNCTION'} recordType - The type of record that is being created inside of the memory.
     * 
     * @returns {Promise<Record>} - The record that was created.
     */
    async createNewRecord(name, recordType) {
        const record = new Record(this.settings, name, recordType)
        return record
    }


    /**
     * Similar to `.push_to_current()` except that this fills the CallStack with another record. When the maxCallStackSize is reached
     * we throw an error.
     * 
     * @param {Record} record - The record object to add as the last item in the call stack
     * 
     * @throws {FlowError} - When the maxCallStackSize is reached.
     * 
     * @returns {Promise<Record>} - The record that was added to the call stack.
     */
    async push(record) {
        record.setNestingLevel(this.records.length)
        if (this.records.length < this.settings.maxCallStackSize) {
            this.records.push(record)
        } else {
            await FlowError.new(this.settings, errorTypes.MEMORY_OVERFLOW, "Stack is full, this means you are calling too many functions at once, try optimizing your code")
        }
        return record
    }

    /**
     * Removes the latest added record from the callstack.
     * 
     * @returns {Promise<Record>} - The record that was removed from the call stack.
     */
    async pop() {
        return this.records.pop()
    }

    /**
     * Peeks to see the latest added Record from the callstack, with this we can get 
     * all of the variables and identities of the current running record.
     * 
     * @returns {Promise<Record>} - The record that was peeked from the call stack.
     */
    async peek() {
        const currentRecord = this.records[this.records.length - 1]
        return currentRecord
    }
}

module.exports = CallStack