const { LibraryModule } = require(".")
const { retrieveRepresentation } = require("../../helpers/library")
const errorTypes = require("../errorTypes")
const { FlowString, FlowDict, FlowList } = require("../objects")
const { INTEGER_TYPE } = require("../types")


class String extends LibraryModule {
    methods = {
        /**
         * Checks if a given FlowObject is a string
         * 
         * @param {object} params - The `isString` function parameters.
         * @param {import('../objects/string')} params.element - The FlowObject element to check if it's a FlowString or not.
         * 
         * @returns {import('../objects/boolean')} - A FlowBoolean object with the result of the check.
         */
        isString: async ({element} = {}) => {
            return await this.newBoolean(element instanceof FlowString)
        },
        /**
         * Transforms a FlowObject into a string representation. It's not that difficult since we already have the _string_ method to retrieve
         * the representation of a FlowObject as FlowStrings.
         * 
         * @param {object} params - The `toString` function parameters.
         * @param {import('../objects/string')} params.element - The FlowObject element to convert to a string.
         * 
         * @returns {import('../objects/string')} - A FlowString object with the string representation of the FlowObject.
         */
        toString: async ({element} = {}) => {
            return await element._string_()
        },
        /**
         * Slices the string from the given start index to the number of character given.
         * 
         * @param {object} params - The `slice` function parameters.
         * @param {import('../objects/string')} params.element - The FlowString element to slice.
         * @param {import('../objects/integer')} params.firstCharacter - The start index to slice from.
         * @param {import('../objects/integer')} params.numberOfCharacters - The number of characters you want to extract from the string.
         * 
         * @returns {import('../objects/string')} - A FlowString object with the sliced string.
         */
        extract: async ({ string, firstCharacter=0, numberOfCharacters=1 } = {}) => {
            if (string instanceof FlowString && firstCharacter.type === INTEGER_TYPE && numberOfCharacters.type === INTEGER_TYPE) {
                string = await retrieveRepresentation(string)
                firstCharacter = await retrieveRepresentation(firstCharacter)
                numberOfCharacters = await retrieveRepresentation(numberOfCharacters)
                return await this.newString(string.slice(firstCharacter, firstCharacter + numberOfCharacters))
            } else {
                if (!string instanceof FlowString) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['extract'][0]}' needs to be a string.`)
                if (firstCharacter.type !== INTEGER_TYPE) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['extract'][1]}' needs to be a integer number.`)
                if (numberOfCharacters.type !== INTEGER_TYPE) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['extract'][2]}' needs to be a integer number.`)
            }
        },
         /**
         * Slices the string from the given start index to the end index given.
         * 
         * @param {object} params - The `slice` function parameters.
         * @param {import('../objects/string')} params.element - The FlowString element to slice.
         * @param {import('../objects/integer')} params.start - The start index to slice from.
         * @param {import('../objects/integer')} params.end - The end index to slice the string from.
         * 
         * @returns {import('../objects/string')} - A FlowString object with the sliced string.
         */
        slice: async ({ string, start=0, end=1 } = {}) => {
            if (string instanceof FlowString && start.type === INTEGER_TYPE && end.type === INTEGER_TYPE) {
                string = await retrieveRepresentation(string)
                start = await retrieveRepresentation(start)
                end = await retrieveRepresentation(end)
                return await this.newString(string.slice(start, end))
            } else {
                if (!string instanceof FlowString) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['slice'][0]}' needs to be a string.`)
                if (start.type !== INTEGER_TYPE) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['slice'][1]}' needs to be a integer number.`)
                if (end.type !== INTEGER_TYPE) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['slice'][2]}' needs to be a integer number.`)
            }
        },
        /**
         * This is used to format strings. It's similar to python's .format syntax, nothing too different.
         * You can format the strings using {} or named like {variable}
         * 
         * For example:
         * ```
         * String.format("Hello {name}, this string is formatted. And as you can see {name}, you can repeat the same code.", { "name": "Lucas" })
         * 
         * String.format("Hello {}, this string is formatted positionaly, it's {} when you need to send a list to format", ["Lucas", "useful"])
         * ```
         * 
         * @param {object} params - The `format` function parameters.
         * @param {import('../objects/string')} params.string - The FlowString element to format.
         * @param {import('../objects/dict') | import('../objects/list')} params.variables - The variables to format the string with. Can be either a FlowDict or a FlowList.
         * or a FlowList, in which case the variables will be passed in the same order as the string.
         * 
         * @returns {import('../objects/string')} - A FlowString object with the formatted string.
         */
        format: async ({ string, variables } = {}) => {
            if (string instanceof FlowString) {
                string = await retrieveRepresentation(string)
                if (variables instanceof FlowDict) {
                    for (let i=0; i < variables.hashTable.rawKeys.numberOfElements; i++) {
                        const rawKey = await variables.hashTable.rawKeys.getItem(i)
                        const representation = rawKey instanceof FlowString ? await rawKey._representation_() : await (await rawKey._string_())._representation_()
                        const value = await variables.hashTable.values.getItem(i)
                        if (value instanceof FlowString) {
                            string = string.replaceAll(`{${representation.toString()}}`, (await value._representation_()).toString())
                        } else {
                            string = string.replaceAll(`{${representation.toString()}}`, await (await value._string_())._representation_())
                        }
                    }
                    return await this.newString(string)
                } else if (variables instanceof FlowList) {
                    for (let i=0; i < variables.array.numberOfElements; i++) {
                        const value = await variables.array.getItem(i)
                        if (value instanceof FlowString) {
                            string = string.replace(`{}`, (await value._representation_()).toString())
                        } else {
                            string = string.replace(`{}`, await (await value._string_())._representation_())
                        }
                    }
                    return await this.newString(string)
                } else {
                    await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['format'][1]}' parameter can be either a list or a dict.`)
                }
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['format'][0]}' parameter should be a string.`)
            }
        },
        /**
         * Splits the string into a list of strings using the given separator. By default we will separate by an empty string, this means it will
         * separate all the characters of the string in a list of characters.
         * 
         * @param {object} params - The `split` function parameters.
         * @param {import('../objects/string')} params.string - The FlowString element to split.
         * @param {import('../objects/string')} params.separator - The separator to split the string with.
         * 
         * @returns {import('../objects/list')} - A FlowList object with the splited string.
         */
        split: async ({ string, separator='' } = {}) => {
            if (string instanceof FlowString && separator instanceof FlowString) {
                string = await retrieveRepresentation(string)
                separator = await retrieveRepresentation(separator)
                return await this.conversorHelper.javascriptValueToFlowObject(string.split(separator))
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['split'][0]}' and '${this.parametersContextForFunctions['split'][1]}' parameters should be strings.`)
            }
        }
    }

    static async documentation() {

    }
}

module.exports = String