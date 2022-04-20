/**
 * Converts a camelCase string to a snake case string formatting, really easy.
 * 
 * @param {String} string - The string to convert from camel to snake
 * 
 * @returns {String} - The converted string. 
 */
function camelCaseToSnakeCase(string) {
    return string.replace(/[A-Z]+/g, letter => `_${letter.toLowerCase()}`)
}

module.exports = camelCaseToSnakeCase