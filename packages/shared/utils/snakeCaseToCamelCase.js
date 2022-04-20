/**
 * Converts a snake_case string to a camelCase string formatting, really easy.
 *
 * @param {string} string - The string to convert from snale to camel
 *
 * @returns {String} - The converted string. 
 */
function snakeCaseToCamelCase(string) {
    return string.toLowerCase().replace(/([-_][a-z])/g, group => {
        return group.toUpperCase().replace('-', '').replace('_', '')
    })
}

module.exports = snakeCaseToCamelCase
