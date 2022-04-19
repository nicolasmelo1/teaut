import { strings } from '../../../../../shared/constants'
import { LANGUAGE } from '../../../conf'

export default function clientStrings(key, { language=undefined, environment='client' }={}) {
    if (language === undefined) language = LANGUAGE
    return strings(key, language, environment)
}