const { snakeCaseToCamelCase, camelCaseToSnakeCase } = require('../../../../../shared/utils')

module.exports = {
    snakeCaseToCamelCase,
    camelCaseToSnakeCase,
    fileUpload: require('./fileUpload'),
    Encrypt: require('./encrypt'),
    CORS: require('./cors'),
    Bucket: require('./storage'),
    strings: require('./strings')
}