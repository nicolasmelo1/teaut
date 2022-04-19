const { strings } = require('../../../../../shared/constants')

function serverStrings(language, key) {
    let string = strings(key, language, 'server')
    if (string !== '') return string
    else {
        const defaultLanguage = 'pt-BR'
        string = strings(key, defaultLanguage, 'server')
        if (string !== '') return string
    }
    return ''
}

module.exports = serverStrings