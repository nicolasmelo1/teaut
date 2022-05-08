import { strings } from '../../../../../shared/constants'
import { LANGUAGE } from '../../../conf'

/**
 * Used to retrieve the strings for the client. This way we can translate the page easily inside of the client application.
 * 
 * @param {string} key - The key of the text label to retrieve.
 * @param {string} [language='undefined'] - The language to retrieve the text for.
 * @param {string} [environment='client'] - The environment that the text is being used on, is this the shared lib, the
 */
export default function clientStrings(key, { language=undefined, environment='client' }={}) {
    if (language === undefined) language = LANGUAGE
    return strings(key, language, environment)
}