/** @module src/formula/utils/lexer */

const Token = require('./token')
const { TokenType } = require('../settings')
const FlowError = require('../builtins/objects/error')
const { SYNTAX } = require('../builtins/errorTypes')

/**
 *  The lexer is responsible for reading the code and transform everything into tokens.
 * 
 * WHAT?
 * 
 * Yep, you've probably already read the tutorials that i've added in the documentation of flow
 * but in case you don't already know. The lexer runs as close as possible as the parser, the parser is a recursion, when 
 * he reaches the END_OF_FILE token it will stop running. The lexer will generate new tokens for the parser as needed. 
 * Flow code is generated like: first parse the code using recursion and call the lexer for new tokens. After reaching the end
 * of the flow code then we will evaluate the code. 
 * 
 * When the lexer generate the END_OF_FILE token no other token will be generated.
 * 
 * The idea is simple, let's suppose the following script:
 * 
 * ```
 * 100+20
 * ```
 * 
 * Okay so let's divide this into a list so we can pass through each character
 * 
 * this.expression = ['1', '0', '0', '+', '2', '0']
 * expression[0] will be 1. the character '1' is what? a number correct? The number is just '1' or '100'? '100' correct?
 * So we do not stop there, let's evaluate the next character, we've got '0'. and the next one '0'. And they are both numbers. 
 * Let's go for the next one, just in case. Uoh we got '+', is it a number? No, what we've got? '1', '0' and '0' so
 * the number probably is '100' so we create a new Token with the value '100'.
 * 
 * Okay, but the next token is '+', let's evaluate that. It's an operation right? but operations can be ">=" or '==', in other words
 * they can be two characters long. So let's evaluate the next one just to see. It's '2'. Okay, not a valid character for an operation
 * so this operation is '+' so the Token will hold the value '+'
 * 
 * And last but not least we evaluate '20' to a token the same way as we did for 100 up there. Then we created the last token.
 * But THIS IS NOT THE LAST TOKEN. The last token WILL ALWAYS BE 'END_OF_FILE', so after we generated the Token(NUMBER,20) we 
 * create the TOKEN(END_OF_FILE, null) to indicate that the program has reached the end.
 * 
 * And that's it.
 */
class Lexer {
    #alreadyValidatedBracePosition = {}
    /**
     * @param {string} expression - The expression to be evaluated.
     * @param {import('../settings').Settings} settings - The settings to be used to evaluate holding the context of flow language.
     */
    constructor(expression, settings) {
        this.settings = settings
        this.rawExpression = expression
        this.expression = expression.split('')
        this.currentPosition = 0
    }

    /**
     * Advance the currentPossition to the next character (kinda confusing, right?)
     * To put it simple, the lexer is always ahead from the parser, at least 1 character.
     * When we get the next token, we advance the currentPosition to the next character. For example:
     * 
     * When retrieving the token for the string '100+20' after we get the token for the value 100, the token will be
     * at position 3, so the '+' character. So when we get the next token again we will already be on the character "+"
     * so we get the token for it. When we return this token we will be sitting and waiting at position '4' so the character
     * '2'. When we want the next token we evaluate and get the token for the value 20. This is what we mean when we say
     * we are ahead from the parser by 1 character.
     * 
     * @param {number} numberOfCharactersToAdvance - The number of characters to to. Sometimes, like when evaluating strings
     * or even numbers we need to advance more than 1 character so we send the number of positions to advance here.
     */
    async advanceNextPosition(positionsToAdvance = 1) {
        this.currentPosition = this.currentPosition + positionsToAdvance

        while (await this.#currentTokenIsSpaceOrTab()) {
            this.currentPosition++
        }
        await this.#ignoreComments()
    }

    /**
     * Peeks the next character in the expression. The idea is that for example on operations. We can have operations like
     * '>=' or '==' and we need to know what is the next character to know what is the operation. So with this function we can
     * peek to a number of characters without actually moving the currentPosition.
     * 
     * @param {number} numberOfCharactersToPeek - The number of characters to peek. Usually you will peek one, but if we had for example
     * the '===' operation we would need to do:
     * ```
     * currentCharacter === '=' && this.peekNextCharacter(1) === '=' && this.peekNextCharacter(2) === '='
     * ```
     * Because we peek by one character by default but the current position will still be the same.
     * 
     * @returns {string | null} - The character that we peeked.
     */
    peekNextCharacter(numberOfCharactersToPeek = 1) {
        const position = this.currentPosition + numberOfCharactersToPeek
        if (position <= (this.expression.length - 1)) {
            return this.expression[position]
        } else {
            return null
        }
    }
    
    /**
     * A more handy and simple function to peek characters and validate. Instead of writing:
     * ```
     * this.peekNextCharacter(1) === '=' && this.peekNextCharacter(2) === '='
     * ```
     * we can write:
     * ```
     * this.peekAndValidate('=', 1) && this.peekAndValidate('=', 2)
     * ```
     * 
     * @param {string} character - The character to validate.
     * @param {number} numberOfCharactersToPeek - The number of characters to peek from the currentPosition.
     * 
     * @returns {boolean} - True if the character is valid, false otherwise.
     */
    peekAndValidate(character, numberOfCharactersToPeek = 1) {
        return this.peekNextCharacter(numberOfCharactersToPeek) === character
    }

    /**
     * Peek and validates a whole string instead by each character. This will peek until a maximum number
     * get all of the characters generating a complete string and validate them.
     * 
     * @param {string} string - The string to validate.
     * 
     * @returns {boolean} - True if the string is valid, false otherwise.
     */
    peekAndValidateStringUntil(string, totalNumberOfCharactersToPeek = 1, startingPosition = 0) { 
        let charactersToPeek = ''
        for (let i = 0; i < totalNumberOfCharactersToPeek; i++) {
            charactersToPeek += this.peekNextCharacter(startingPosition + i)
        }
        return charactersToPeek === string
    }

    /**
     * Validates if a given brace is closed so we don't evaluate indefinetly.
     * 
     * I know this might not be efficient for big chunks of code but most of the time flow code will be small since
     * this was meant to be a scripting language not a full featured language like python of javascript so it's okay to 
     * use functions like this to check the braces closures.
     * 
     * @param {string} braceToClose - The brace that was opened. For example '{' or '(' or '['
     * @param {string} closingBrace - The brace that needs to appear in order to be closed. For example '}' or ')' or ']'
     */
    async #validateClosureOfBraces(braceToClose, closingBrace) {
        let count = 0
        while (this.currentPosition + count < this.expression.length) {
            const nextCharacter = this.peekAndValidate(closingBrace, count)
            if (nextCharacter === true && this.#alreadyValidatedBracePosition[this.currentPosition + count] !== closingBrace) {
                this.#alreadyValidatedBracePosition[this.currentPosition + count] = closingBrace
                return nextCharacter
            } else {
                count++
            }
        }
        await FlowError.new(this.settings, SYNTAX, `Need to close brace '${braceToClose}' at position ${this.currentPosition}`)
    }

    /**
     * Checks if the current character is a space or a tab string. We use this in a loop so we ignore those characters until we 
     * find something meaningful for us to tokenize.
     * 
     * @returns {Promise<boolean>} - True if the character is a space or a tab, false otherwise.
     */
    async #currentTokenIsSpaceOrTab() {
        return this.currentPosition < (this.expression.length - 1) && [' ', '\t'].includes(this.expression[this.currentPosition])
    }

    /**
     * Just ignore comments that are strings starting with '#'. We ignore this hole line until we get to the next one.
     */
    async #ignoreComments() {
        if (this.currentPosition < (this.expression.length - 1) && this.expression[this.currentPosition] === this.settings.commentCharacter) {
            while (this.expression[this.currentPosition] !== '\n') {
                this.currentPosition++
            }
        }
    }

    /**
     * Remember in `advanceNextPosition()` that i said that the lexer is always ahead of the parser? So this function is used to get the current token.
     * The next token for the parser is the current for the lexer, this naming can cause confusion for some people but it's not that difficult.
     * 
     * At the top of this function we have a simple if to check if the code has not reached the end. If it has just return the END_OF_FILE. Otherwise return
     * and evaluate the next token.
     * 
     * The ordering is of the ifs here is extremely important because numbers need to be evaluated before keywords. SO be aware that if you change the order
     * of the conditions, things might brake in the language itself. ANd be extremely careful when you add a new condition.
     * 
     * @returns {Promise<Token>} - Returns a new token with the values to send to the parser. The token holds a type, a value and the position in the code so
     * we can display the error nicely for the user.
     */
    async #handleCurrentToken() {
        if (this.currentPosition < this.expression.length) { 
            const CURRENT_CHARACTER = this.expression[this.currentPosition]
            // be aware, the ordering of the conditions here are extremely important.
            // we can have numbers on variables, but if the first character is a number, it must be considered as a number
            // AND NOT a keyword. If we changed the order 1234 would be an Identity and not a Number.
            if (this.settings.stringDelimiters.includes(CURRENT_CHARACTER)) {
                return await this.#handleString()
            } else if (this.settings.validNumbersCharacters.includes(CURRENT_CHARACTER)) {
                return await this.#handleNumber()
            } else if (this.settings.sigilString.includes(CURRENT_CHARACTER) && this.peekAndValidate(this.settings.datetimeDateCharacter) && this.peekAndValidate('[', 2)) {
                return await this.#handleDatetime()
            } else if (this.peekAndValidateStringUntil(this.settings.documentationKeyword, this.settings.documentationKeyword.length)) {
                return await this.#handleDocumentation()
            } else if (this.settings.validateCharacterForIdentityOrKeywords(CURRENT_CHARACTER)) {
                return await this.#handleKeyword()
            } else if (this.settings.operationCharacters.includes(CURRENT_CHARACTER)) {
                return await this.#handleOperation()
            } else if (this.settings.validBraces.includes(CURRENT_CHARACTER)) {
                return await this.#handleBraces()
            } else if (this.settings.attributeCharacter === CURRENT_CHARACTER) {
                const token = new Token(TokenType.ATTRIBUTE, this.settings.attributeCharacter, this.currentPosition)
                await this.advanceNextPosition()
                return token
            } else if (CURRENT_CHARACTER === '\n') {
                const token = new Token(TokenType.NEWLINE, '\n', this.currentPosition)
                await this.advanceNextPosition()
                return token
            } else if (CURRENT_CHARACTER === this.settings.positionalArgumentSeparator) {
                const token = new Token(TokenType.POSITIONAL_ARGUMENT_SEPARATOR, this.settings.positionalArgumentSeparator, this.currentPosition)
                await this.advanceNextPosition()
                return token
            }
        }
        return new Token(TokenType.END_OF_FILE, null, this.currentPosition)
    }
    
    /**
     * Handles open and closing braces for function call, slices, dictionaries, lists, and etc. This also validate the closure of the braces.
     * Check `#validateClosureOfBraces()` method for more information about this.
     * 
     * @returns {Promise<Token>} - Returns a new token with the values to send to the parser. The token holds a type, a value and the position in the code so
     * we can display the error nicely for the user. This will hold the brace value as string.
     */
    async #handleBraces() {
        const CURRENT_CHARACTER = this.expression[this.currentPosition]

        if (CURRENT_CHARACTER === '(') {
            await this.advanceNextPosition()
            await this.#validateClosureOfBraces('(', ')')
            return new Token(TokenType.LEFT_PARENTHESIS, '(', this.currentPosition)
        } else if (CURRENT_CHARACTER === ')') {
            await this.advanceNextPosition()
            return new Token(TokenType.RIGHT_PARENTHESIS, ')', this.currentPosition)
        } else if (CURRENT_CHARACTER === '[') {
            await this.advanceNextPosition()
            await this.#validateClosureOfBraces('[', ']')
            return new Token(TokenType.LEFT_BRACKETS, '[', this.currentPosition)
        } else if (CURRENT_CHARACTER === ']') {
            await this.advanceNextPosition()
            return new Token(TokenType.RIGHT_BRACKETS, ']', this.currentPosition)
        } else if (CURRENT_CHARACTER === '{') {
            await this.advanceNextPosition()
            await this.#validateClosureOfBraces('{', '}')
            return new Token(TokenType.LEFT_BRACES, '{', this.currentPosition)
        } else if (CURRENT_CHARACTER === '}') {
            await this.advanceNextPosition()
            return new Token(TokenType.RIGHT_BRACES, '}', this.currentPosition)
        } else {
            await FlowError.new(this.settings, SYNTAX, `invalid braces: ${CURRENT_CHARACTER}`)
        }
    }
    
    /**
     * The user can write documentation to his code by adding:
     *  
     * (PLEASE, NOTICE THAT `* /` IS USED BECAUSE WE CANNOT USE IT WITHOUT SPACES HERE)
     * ```
     * @doc /* this is a documentation * /
     * ```
     * Before a statement so we can document the next block of code.
     * 
     * The space after the @doc is not obligatory and can be totally omited and you can have as many spaces as you want until '/*', 
     * notice also that '/*' should be defined in the same line as @doc or otherwise the parser will not be able to evaluate.
     * 
     * @returns {Promise<Token>} - Returns a new token with the documentation string value to send to the parser for it to evaluate.
     */
    async #handleDocumentation() {
        let counter = this.settings.documentationKeyword.length
        let documentationString = []
        
        // ignore spaces
        while (this.peekAndValidate(' ', counter)) {
            counter++
        }

        const isNextThreeCharactersTheOpenDocumentationString = this.peekAndValidate('/', counter) && this.peekAndValidate('*', counter+1)

        if (isNextThreeCharactersTheOpenDocumentationString) {
            counter = counter + 3
            while (!(this.peekAndValidate('*', counter) && this.peekAndValidate('/', counter+1))) {
                if (this.expression[this.currentPosition + counter] === undefined) {
                    await FlowError.new(this.settings, SYNTAX, `You must close the ${this.settings.documentationKeyword} tag with */`)
                } else {
                    documentationString.push(this.expression[this.currentPosition + counter])
                    counter++
                }
            }
        } else {
            await FlowError.new(this.settings, SYNTAX, `You must define the documentation between '/*' and '*/'. Example: @doc /* this is a doc */`)
        }
        await this.advanceNextPosition(counter+3)
        
        const token = new Token(TokenType.DOCUMENTATION, documentationString.join(''), this.currentPosition)

        return token
    }

    /**
     * Handles the datetime in flow. Datatime can be represented as ~D[2010-01-20] or ~D[2010-01-20 10:20:30]
     * 
     * To make it easier for us to handle the datetime we just get the value between the square brackets. (2010-01-20)
     * 
     * After getting the datetime we advance counter+1 because we ignore the closing square bracket.
     * 
     * @returns {Promise<Token>} - Returns a new token with the datetime value to send to the parser for it to evaluate.
     */
    async #handleDatetime() {
        let counter = 3
        const datetime = [] 

        await this.#validateClosureOfBraces('[', ']')
        while (this.peekNextCharacter(counter) !== ']') {
            datetime.push(this.expression[this.currentPosition + counter])
            counter++
        }
        await this.advanceNextPosition(counter + 1)
        return new Token(TokenType.DATETIME, datetime.join(''), this.currentPosition)
    }

    /**
     * Used to handle the numbers inside of flow. Since flow is supposed to be translated, we can have decimal point characters
     * represented either as ',' or as '.', or whatever we like. By changing the decimalPointCharacter we need to be aware that we should
     * change the character for the separators.
     * 
     * We validate if the number has more than one decimalPoint, if it has then it's not valid, otherwise it is.
     * 
     * @returns {Promise<Token>} - Returns a new token with the number value to send to the parser. If it has a decimalPointCharacter then it is a float,
     * if not then it is an integer.
     */
    async #handleNumber() {
        let counter = 0
        const number = []

        while (this.settings.validNumbersCharacters.includes(this.peekNextCharacter(counter)) ||
                this.peekNextCharacter(counter) === this.settings.decimalPointCharacter) {
            
            const doesNumberHasMoreThanOneDecimalPointCharacter = this.peekNextCharacter(counter) === this.settings.decimalPointCharacter && 
                number.includes(this.settings.decimalPointCharacter)

            if (doesNumberHasMoreThanOneDecimalPointCharacter) {
                break
            }
            number.push(this.expression[this.currentPosition + counter])
            counter++
        }
        
        await this.advanceNextPosition(counter)
        if (number.includes(this.settings.decimalPointCharacter)) {
            return new Token(TokenType.FLOAT, number.join(''), this.currentPosition)
        } else {
            return new Token(TokenType.INTEGER, number.join(''), this.currentPosition)
        }
    }

    /**
     * Validates the string inside of flow. Strings, different from JS or python can span multiple lines. The strings can be represented either by '`' or
     * '"'. We can add new string types if we want but we don't need at the current time. After we can also create better multiline strings for handling cases
     * where both characters can appear.
     * 
     * We ignore the string delimiter of the string, so we jump one position ahead after we get the string.
     * 
     * @returns {Promise<Token>} - Returns a new token with the string value to send to the parser. We ignore bthe stringDelimiter character from the strings.
     */
    async #handleString() {
        let counter = 1
        const string = []
        const stringDelimiter = JSON.parse(JSON.stringify(this.expression[this.currentPosition]))

        await this.#validateClosureOfBraces(stringDelimiter, stringDelimiter)
        while (await !this.peekAndValidate(stringDelimiter, counter) && this.expression[this.currentPosition + counter] !== undefined) { 
            string.push(this.expression[this.currentPosition + counter])
            counter++
        }
        // we do not consider the last '"' or '`' character so we skip one from the currentPosition and get directly the next character
        // after the enclosing string delimiter pair.
        await this.advanceNextPosition(counter+1)

        return new Token(TokenType.STRING, string.join(''), this.currentPosition)
    }
    
    /**
     * Handles all the keywords of flow. If no keyword is found here we will handle Identity. Indetity is a more beautiful name
     * for variable. Variables can have any name, they can have any valid word as characters but also numbers (not as first arguments though)
     * and underline (_). All other characters are not supported. Check `validateCharacterForIdentityOrKeywords` in Settings for further
     * reference.
     * 
     * Numbers can't be first arguments in flow indentities. This means that 1variable = 1 is not valid and should be rewritten as variable1 = 1
     * 
     * Although variables cannot have space, we can define keywords with spaces, so when this happens we validate the hole keyword. For example:
     * `não é` or `caso contrário` are both examples of a single keyword although they have spaces.
     * 
     * @returns {Promise<Token>} - Returns a new token with the keyword or identity value to send to the parser.
     */
    async #handleKeyword() {
        const getKeywordAndCounter = async (counterOffset=0) => {
            let counter = counterOffset
            const keyword = []

            while (this.settings.validateCharacterForIdentityOrKeywords(this.peekNextCharacter(counter))) {
                keyword.push(this.expression[this.currentPosition + counter])
                counter++
            }

            return {
                keyword: keyword.join(''),
                counter: counter
            }
        }
        
        let { keyword, counter } = await getKeywordAndCounter()

        /**
         * Validates if the generated keyword is a keyword or not. Here we are also able to validate keywords with spaces, we validate this
         * by looping through the expected keyword and checking if it matches the keyword we got. You might ask why we don't loop character
         * by character when validating this. For example: 
         * Suppose that the keyword is `não é`
         * 1 - We first get the keyword `não`, then we will see if the next character is ' ', if it is then we move to the next character.
         * 2 - We get the word `é` and we will see if it matches with the complete keyword `não é`. It actually matches, but the phrase is
         * `não égua` and not `não é`. Although it appear as valid, `não égua` IS NOT the expected `não é`.
         * 
         * So to solve this we bypass the spaces in the expected keyword and we validate the keyword keyword per keyword. So in the example above.
         * comparing `não égua` to `não é` will fail.
         * 
         * @param {string} keyword - The keyword to validate if it is or not.
         * @param {number} [peekOffset=0] - The offset to the next character to check. We have already moved the currentPosition offset, but we might
         * need to validate more characters.
         * 
         * @returns {Promise<boolean>} - Returns true if the keyword is a keyword, false if it is not.
         */
        const isKeyword = async (expectedKeyword, peekOffset=0) => {
            const restOfExpectedKeywordLength = expectedKeyword.length - keyword.length
            const isProbablyAKeyword = expectedKeyword.startsWith(keyword) 
            if (isProbablyAKeyword && restOfExpectedKeywordLength >= 0) {
                if (restOfExpectedKeywordLength === 0) {
                    await this.advanceNextPosition(peekOffset)
                    return true
                } else {
                    // This is supposed to get keywords that have space in it like `NÃO É 'teste'` for example, or `CASO CONTRÁRIO faça 2 + 2 = 4`
                    let keywordToValidate = keyword
                    for (let i = 0; i < restOfExpectedKeywordLength; i++) {
                        const isNotTheKeywordExpected = expectedKeyword.startsWith(keywordToValidate) === false
                        if (isNotTheKeywordExpected) return false

                        const nextCharacterInExpectedKeyword = expectedKeyword[keywordToValidate.length]
                        if (nextCharacterInExpectedKeyword !== ' ') {
                            const { keyword: newKeyword, counter } = await getKeywordAndCounter(peekOffset)
                            peekOffset = counter
                            keywordToValidate = `${keywordToValidate}${newKeyword}`
                        } else {
                            peekOffset = peekOffset + 1
                            keywordToValidate = `${keywordToValidate}${nextCharacterInExpectedKeyword}`
                        }
                    }
                    if (keywordToValidate === expectedKeyword) {
                        keyword = keywordToValidate
                        await this.advanceNextPosition(peekOffset)
                        return true
                    } else return false
                }
            }
            return false
        }
        
        if (await isKeyword(this.settings.blockKeywords['do'], counter)) {
            return new Token(TokenType.DO, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.blockKeywords['end'], counter)) {
            return new Token(TokenType.END, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.ifKeywords['if'], counter)) {
            return new Token(TokenType.IF, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.ifKeywords['else'], counter)) {  
            return new Token(TokenType.ELSE, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.equalityKeyword, counter)) {
            return new Token(TokenType.EQUAL, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.inequalityKeyword, counter)) {
            return new Token(TokenType.DIFFERENT, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.errorKeywords['try'], counter)) {
            return new Token(TokenType.TRY, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.errorKeywords['catch'], counter)) {
            return new Token(TokenType.CATCH, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.errorKeywords['raise'], counter)) {
            return new Token(TokenType.RAISE, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.returnKeyword, counter)) {
            return new Token(TokenType.RETURN, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.booleanKeywords['true'], counter)) {
            return new Token(TokenType.BOOLEAN, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.booleanKeywords['false'], counter)) {
            return new Token(TokenType.BOOLEAN, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.nullKeyword, counter)) {
            return new Token(TokenType.NULL, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.moduleKeyword, counter)) {
            return new Token(TokenType.MODULE, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.functionKeyword, counter)) {
            return new Token(TokenType.FUNCTION, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.conjunctionKeyword, counter)) {
            return new Token(TokenType.AND, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.disjunctionKeyword, counter)) {
            return new Token(TokenType.OR, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.inversionKeyword, counter)) {
            return new Token(TokenType.NOT, keyword, this.currentPosition)
        } else if (await isKeyword(this.settings.includesKeyword, counter)) {
            return new Token(TokenType.IN, keyword, this.currentPosition)
        } else {
            await this.advanceNextPosition(counter)
            return new Token(TokenType.IDENTITY, keyword, this.currentPosition)
        }
    }

    /**
     * WIll handle all of the possible operations that flow actually permits. Operations can be for concatanating strings
     * or for math operations or either for comparison. We support a bunch of them. In the near future we might support even
     * bitwise operators, but since this is a scripting language meant for simple usage, this is not needed at the given time.
     * 
     * Same as the `handleCurrentToken()` method, the ordering here is also extremely important because longer operations 
     * (the ones with more characters) might need to be checked before smaller operations (the ones with less characters).
     * 
     * @returns {Promise<Token>} - Returns a new token with the operation value to send to the parser.
     */
    async #handleOperation() {
        const CURRENT_CHARACTER = this.expression[this.currentPosition]
        // be aware, the ordering of the conditions here are extremely important.
        // first we get the conditions that match most characters, than the ones with least number of characters
        // if we had '===' we would add this condition at the top of all the other conditions.
        if (CURRENT_CHARACTER === '<' && this.peekAndValidate('-')) {
            await this.advanceNextPosition(2)
            return new Token(TokenType.ASSIGN, '<-', this.currentPosition)
        } else if (CURRENT_CHARACTER === '=' && this.peekAndValidate('=')) {
            await this.advanceNextPosition(2)
            return new Token(TokenType.EQUAL, '==', this.currentPosition)
        } else if (CURRENT_CHARACTER === '!' && this.peekAndValidate('=')) {
            await this.advanceNextPosition(2)
            return new Token(TokenType.DIFFERENT, '!=', this.currentPosition)
        } else if (CURRENT_CHARACTER === '<' && this.peekAndValidate('=')) {
            await this.advanceNextPosition(2)
            return new Token(TokenType.LESS_THAN_EQUAL, '<=', this.currentPosition)
        } else if (CURRENT_CHARACTER === '>' && this.peekAndValidate('=')) {
            await this.advanceNextPosition(2)
            return new Token(TokenType.GREATER_THAN_EQUAL, '>=', this.currentPosition)
        } else if (CURRENT_CHARACTER === '=') {
            await this.advanceNextPosition()
            return new Token(TokenType.ASSIGN, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '+') {
            await this.advanceNextPosition()
            return new Token(TokenType.SUM, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '-') {
            await this.advanceNextPosition()
            return new Token(TokenType.SUBTRACTION, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '*') {
            await this.advanceNextPosition()
            return new Token(TokenType.MULTIPLICATION, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '/') {
            await this.advanceNextPosition()
            return new Token(TokenType.DIVISION, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '^') {
            await this.advanceNextPosition()
            return new Token(TokenType.POWER, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '%') {
            await this.advanceNextPosition()
            return new Token(TokenType.REMAINDER, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '<') {
            await this.advanceNextPosition()
            return new Token(TokenType.LESS_THAN, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === '>') {
            await this.advanceNextPosition()
            return new Token(TokenType.GREATER_THAN, CURRENT_CHARACTER, this.currentPosition)
        } else if (CURRENT_CHARACTER === ':') {
            await this.advanceNextPosition()
            return new Token(TokenType.COLON, CURRENT_CHARACTER, this.currentPosition)
        }
    }

    /**
     * Gets the next token from the expression.
     * 
     * Remember what we said on `advanceNextPosition()`? The lexer is always ahead of the parser so the next token for the parser
     * is actually the current token for the lexer. This can cause some confusion but since THIS is the api you will call from the lexer
     * it actually makes sense.
     * 
     * @returns {Promise<Token>} - Returns a new token with the next value to send to the parser.
     */
    async getNextToken() {
        return await this.#handleCurrentToken()
    }
}

module.exports = Lexer