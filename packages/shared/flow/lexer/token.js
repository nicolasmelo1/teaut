/** @module src/formula/utils/lexer/token */

/**
 * This is each token of flow. Each token is just a object with the type, the value (as a string) and the last position of
 * this token in the expression so we can throw an error safely.
 */
class Token{
    /**
     * @param {string} tokenType - One of TokenType class types. Check `../settings.js` on the class TokenTypes for reference.
     * @param {string} value - The value of the token. This is the actual value that we will probably use and interpret.
     * @param {number} position - The last position of the token in the expression.
     */
    constructor(tokenType, value, position){
        this.tokenType = tokenType
        this.value = value
        this.position = position - 1
    }
}

module.exports = Token