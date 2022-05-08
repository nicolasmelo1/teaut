const ptBR = require('./pt-BR')
const enUS = require('./en-US')

const languagePack = {
    'pt-BR': ptBR,
    'en-US': enUS
}

/**
 * This is responsible for returning a text label on a given language. For example:
 * instead of directly wiritting: 
 * 
 * 'Cadastro' in the button you will write:
 * {strings('pt-BR', 'loginOnboardingButtonLabel')}
 * 
 * And then you will define what `loginOnboardingButtonLabel` means inside the `pt-BR` file. If you want
 * to support another language, just create a new file and add the texts to the language pack.
 * 
 * @param {string} key - The key of the text label.
 * @param {string} [language='pt-BR'] - One of the supported languages. See `languagePack` variable up here for reference.
 * @param {string} [environment='shared'] - The environment that the text is being used on, is this the shared lib, the 
 * 
 * @returns {string} - The text label to use in your component.
 */
function strings(key, language='en-US', environment='shared') {
    if (languagePack[language] && languagePack[language][environment] && languagePack[language][environment][key]) {
        return languagePack[language][environment][key]
    } else {
        return ''
    }
}

module.exports = strings