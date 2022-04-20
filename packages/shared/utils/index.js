const delay = require('./delay')
const generateUUID = require('./generateUUID')
const deepCopy = require('./deepCopy')
const emailValidation = require('./emailValidation')
const base64 = require('./base64')
const httpStatus = require('./httpStatus')
const camelCaseToSnakeCase = require('./camelCaseToSnakeCase')
const snakeCaseToCamelCase = require('./snakeCaseToCamelCase')

module.exports = {
    httpStatus,
    base64,
    generateUUID,
    delay,
    deepCopy,
    emailValidation,
    camelCaseToSnakeCase,
    snakeCaseToCamelCase
}