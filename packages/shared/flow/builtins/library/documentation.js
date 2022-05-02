const { FlowObject } = require('../objects')
const { LibraryModule } = require('./index')


class Documentation extends LibraryModule {
    methods = {
        /**
         * Retrieves the documentation of a given module, function or basically anything inside of Flow. You can do whatever you want
         * with the documentation since the documentation generated is a valid FlowObject.
         * 
         * @param {object} params - The parameters recieved by `get` method.
         * @param {import('../objects/object')} params.obj - The object to retrieve the documentation of this can be either the documentation defined
         * in bultin modules, or the documentation defined with @doc /* * / syntax.
         * 
         * @returns {import('../objects/object')} - The documentation of the given object. Generally it's a string but since it can be overriden
         * by the user we can retrieve any object type.
         */
        get: async ({element} = {}) => {
            if (element instanceof FlowObject) return await element._documentation_()
        },
        /**
         * With the @doc syntax we can add the documentation to a function, module or any other object in flow. But using this function
         * we can also set the documentation of a function, module or any other object in flow. Since @doc syntax will convert everything to
         * a string, we can use this function to add objects, lists or more complex objects inside of the documentation.
         * 
         * @param {object} params - The parameters recieved by `set` method.
         * @param {import('../objects/object')} params.element - The object to set the documentation for.
         * @param {import('../objects/object')} params.documentation - The documentation to set for the given object.
         * 
         * @returns {import('../objects/object')} - Returns the object that you set the documentation for.
         */
        set: async ({element, documentation} = {}) => {
            if (element instanceof FlowObject) {
                element.documentation = documentation
            }
            return element
        }
    }

    static async documentation() {
        
    }
}

module.exports = Documentation