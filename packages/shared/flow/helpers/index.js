/** @module src/formula/utils/helpers */
const { camelCaseToSnakeCase, snakeCaseToCamelCase } = require('../../utils')
const DatetimeHelper = require('./datetime')
const DynamicArrayHelper = require('./dynamicArray')
const HashMapHelper = require('./hashMap')
const library = require('./library')

/**
 * In javascript we can't get the memory address of the object. So to mimic this behaviour and make each object unique
 * we given them a unique uuid, this id will make the flow object unique so we can check for their equality and other stuff.
 * 
 * Reference: https://stackoverflow.com/a/8809472
 * 
 * @returns {string} - A unique id for the flow object.
 */
function getFlowObjectId() { 
    let date = new Date().getTime()//Timestamp
    let performanceDate = (performance && performance.now && (performance.now()*1000)) || 0//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        let randomNumber = Math.random() * 16//random number between 0 and 16
        if (date > 0) {//Use timestamp until depleted
            randomNumber = (date + randomNumber) % 16 | 0
            date = Math.floor(date/16)
        } else {//Use microseconds since page-load if supported
            randomNumber = (performanceDate + randomNumber) % 16 | 0
            performanceDate = Math.floor(performanceDate/16)
        }
        return (character === 'x' ? randomNumber : (randomNumber & 0x3 | 0x8)).toString(16)
    })
}

/**
 * Get the conext of the code so we can show the user exactly what is wrong with his code and give him a better error message than just a simple string
 * with the error message.
 * 
 * @param {number} position - The position where the error occured.
 * @param {string} expression - The hole script code so we can parse it.
 * 
 * @return {string} - The context of the code that gave an error.
 */
 function getErrorCodeContext(position, expression) {
    let counterBefore = 0
    let positionBefore = position - counterBefore

    while (positionBefore > 0 && expression[positionBefore] !== '\n' && counterBefore < 60) {
        counterBefore++
        positionBefore = position - counterBefore
    }
    let counterAfter = 0
    let positionAfter = position + counterAfter
    
    while (positionAfter < expression.length && expression[positionAfter] !== '\n' && counterAfter < 60) {
        counterAfter++
        positionAfter = position + counterAfter
    }
    
    
    let codeContext = expression.slice(positionBefore, positionAfter)
    codeContext = codeContext.replaceAll(/\n/g, '')

    if (isNaN(positionAfter) || isNaN(positionBefore)) {
        return ''
    } else {
        let showError = Array.apply(null, Array(positionAfter - positionBefore)).map(() => ' ')
        showError[position - positionBefore] = '^'
        return `\n${codeContext}\n${showError.join('')}`
    }
}

/**
 * In order to have `return` clauses inside of flow we need to make a little hack. This hack is simple as throwing an error.
 * So when we have a `return` clause inside of a flow we can catch this error where we want and interpret it the way we want.
 * 
 * So in the interpreter we will do `throw new ReturnStatement(await this.evaluate(node.expression, false))` by doing this we will throw
 * the expression inside of the error in javascript. This way, inside of the function we catch the error and interpret the value as it's needed.
 */
class ReturnStatement extends Error {
    /**
     * @param {import('../builtins/objects') | function} value - The expression that we want to be catched
     */
    constructor(value) {
        super()
        this.value = value
    }
}
module.exports = {
    snakeCaseToCamelCase,
    camelCaseToSnakeCase,
    getFlowObjectId,
    getErrorCodeContext,
    DatetimeHelper,
    ReturnStatement,
    DynamicArrayHelper,
    HashMapHelper,
    libraryHelpers: library,
}