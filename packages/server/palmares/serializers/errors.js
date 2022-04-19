class ValidationError extends Error {
    /**
     * We do not destructure the options here, this way you can send your own custom validations.
     * The structure here is only for internal use.
     * 
     * @param {string} fieldName - The name of the field that failed
     * @param {string} reason - Why it failed, should be a machine readable string.
     * @param {string} errorKey - The key of the error message to use. This way the programmer
     * can override this error message
     */
    constructor(options = {}) {
        super(JSON.stringify(options))
    }
}

module.exports = { 
    ValidationError
}