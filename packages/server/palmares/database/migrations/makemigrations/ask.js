/**
 * @module config/database/migrations/makemigrations/ask
 */

const readline = require('readline')
const { stdin: input, stdout: output } = require('process')

/**
 * Function used for initializing the readline interface, since we use recursion in `didUserRename` it can cause issues if we open to many interfaces without closing, if we close the interface
 * on the recursion then it will not be possible to read again. So in order to work we need to create a singleton. This singleton will hold the interface, and it is simple as
 * We retrieve the interface, if the interface was created and was not closed then we will retrieve it, otherwise we will create a new one.
 * 
 * After we finished using the interface we will close the interface using `closeReadlineInterface` function.
 * 
 * @returns {{
 *      retrieveReadlineInterface: () => import('readline').Interface,
 *      closeReadlineInterface: () => void
 * }} - Returns 2 functions, one for retrieving the interface and one for closing the interface.
 */
function readlineInterfaceInitializer() {
    let readlineInterface = null

    /**
     * Functions used for retrieving the readline interface, if it was not created or it was closed we will return a new one.
     * 
     * @returns {import('readline').Interface} - Returns the readline interface.
     */
    function retrieveReadlineInterface() {
        const interfaceIsNotClosed = ![null, undefined].includes(readlineInterface) && readlineInterface.closed !== true
        if (interfaceIsNotClosed) return readlineInterface 
        else {
            readlineInterface = readline.createInterface({ input, output })
            return readlineInterface
        }
    }

    /**
     * Closes the readline interface.
     */
    function closeReadlineInterface() {
        const interfaceIsNotClosed = ![null, undefined].includes(readlineInterface) && readlineInterface.closed !== true
        if (interfaceIsNotClosed) readlineInterface.close()
    }

    return {
        retrieveReadlineInterface,
        closeReadlineInterface
    }
}

const readlineInterface = readlineInterfaceInitializer()

/**
 * Responsible for asking user stuff like:
 * Did you rename a model in favor of another or did you rename a field?
 * 
 * Stuff like that
 * 
 * We have a second type of asker: where we prompt the user for selecting a Option like (1, 2, 3, and such)
 * This is ideal when we are not sure if a user made an action or not. So we prompt him to ask.
 */
const asker = {
    theNewAttributeCantHaveNullDoYouWishToContinue: (modelName, attributeName) => {
        const question = `\x1b[0mIf the model \x1b[33m${modelName}\x1b[0m already have data, it can cause issues when migrating the new \x1b[36m${attributeName}\x1b[0m column ` + 
        `because you didn't set a \x1b[33mdefaultValue\x1b[0m or \x1b[33mallowNull \x1b[0mis set to \x1b[33mfalse\x1b[0m. \n`+
        `You can safely ignore this message if you didn't add any data to the table. \n\n` + `Press any key to continue or 'CTRL+C' to stop and define the attributes yourself.\n`
        return new Promise((resolve, reject) => {
            readlineInterface.retrieveReadlineInterface().question(question, (answer) => {
                if (answer.toLowerCase() === 'n') {
                    resolve(false)
                } else {
                    resolve(true)
                }
                readlineInterface.closeReadlineInterface()
            })
        })
    },
    didUserRename: (modelThatWasRenamed, renamedTo) => {
        const question = `\nDid you rename '${modelThatWasRenamed}' to '${renamedTo}'? [y/n]\n`
        return new Promise((resolve, reject) => {
            readlineInterface.retrieveReadlineInterface().question(question, (answer) => {
                if (['y', 'n'].includes(answer)) {
                    readlineInterface.closeReadlineInterface()
                    resolve(answer === 'y')
                } else {
                    resolve(asker.didUserRename(modelThatWasRenamed, renamedTo))
                }
            })
        })
    },
    didUserRenameToOneOption: (valueThatWasRenamed, renamedToOptions) => {
        const toOptions = renamedToOptions.map((renamedTo, index) => `${index+1}. ${renamedTo}`)
        const explanation = '\nPlease type the corresponding number or leave blank if you have not renamed'
        const question = `\nDid you rename '${valueThatWasRenamed}' to one of the following options? \n${toOptions.join('\n')} \n\n${explanation}\n`

        return new Promise((resolve, reject) => {
            readlineInterface.retrieveReadlineInterface().question(question, (answer) => {
                if (answer === '') {
                    resolve(false)
                } else {
                    try {
                        resolve(renamedToOptions[parseInt(answer) - 1])
                    } catch {
                        resolve(false)
                    }
                }
                readlineInterface.closeReadlineInterface()
            })
        })
    }
}

module.exports = asker