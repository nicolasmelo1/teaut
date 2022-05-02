const { LibraryModule } = require('./index')
const { FlowBoolean } = require("../objects")


class _Boolean extends LibraryModule {
    methods = {
        /**
         * Checks if a given element is a boolean.
         * 
         * @param {object} params - The parameters of `isBoolean` function.
         * @param {import('../objects/object')} params.element - The element to check if it's a boolean or not.
         * 
         * @returns {import('../objects/boolean')} - Returns `true` if the element is a boolean, `false` otherwise.
         */
        isBoolean: async ({ element } = {}) => {
            return await this.newBoolean(element instanceof FlowBoolean)
        }
    }

    static async documentation() {
        
    }
}

module.exports = _Boolean