let API_HOST = ''
let BEARER = 'Client'
let LANGUAGE = 'en-US'
const APP = process.env['APP'] === 'web' ? 'web' : 'mobile' 

/**
 * This function is used to configure all of the config variables for the shared component.
 * The idea is that this will keep us independent from configuring env files or whatever gimmicks we might have.
 * We just need to call this functions and then BAM, all of the variables will be configured for you to use.
 * 
 * So in other words, this must be the first thing you call before rendering anything in your application.
 * 
 * @param {object} configurationOptions - All of the options that we need to configure in our application for it 
 * to run smoothly
 * @param {string} configurationOptions.apiHost - The host for the api so that we can make calls to it easily.
 * @param {string} [configurationOptions.bearer='Client'] - The bearer that will be used to make the requests to the api.
 * You probably know them as `Bearer`, but here we use `Client`.
 * @param {string} [configurationOptions.language='pt-BR'] - The language that will be used on the application.
 */
function configureConf({ apiHost, bearer='Client', language='en-US' } = {}) {
    API_HOST = apiHost
    BEARER = bearer,
    LANGUAGE = language
}

export { APP, API_HOST, BEARER, LANGUAGE }
export { configureConf }