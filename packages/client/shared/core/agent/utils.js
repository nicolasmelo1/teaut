import { APP } from '../../conf'
import { BEARER } from '../../conf'
import dynamicImport from '../utils/dynamicImport'

const AsyncStorage = dynamicImport('@react-native-async-storage/async-storage')

/**
 * We can add handlers to the exception observer so when an exception occurs when trying to retrieve some data or send
 * some data we will be able to by default call any callback that is added.
 * 
 * THis is useful for example: you want to display an alert when an error occurs.
 * You want to do something when the user is not authenticated.
 * 
 * @returns {{
 *      addCallback: function(callback: function(response: import('axios').Response, makeRequestAgain: function()), callbackName),
 *      fireHandlers: function(response: import('axios').Response, makeRequestAgain: function)
 * }} - Returns an object with the function to add the callbacks and to fire the handlers.
 */
function exceptionObserver() {
    const callbacks = {}

    /**
     * Adds a callback to be called when an exception occurs. By default this callback will live inside
     * of an object, this means we can't have the same callback twice. This guarantees it's uniqueness inside
     * here.
     * 
     * By default we use the name of the function as the key but you can also send the name of the callback if you want.
     * 
     * @param {function} callback - The callback to be called when an exception occurs.
     * @param {string} [callbackName=null] - The name of the callback to be used as key. If null we will use the name
     * of the function.
     */
    function addCallback(callback, callbackName=null) {
        if (callbackName === null) callbackName = callback.name
        callbacks[callbackName] = callback
    }

    /**
     * This will fire the callbacks when an error occurs, this way you can handle the error, make the request again, show a message
     * whatever you want.
     * 
     * @param {import('axios').Response} response - The response from the axios request.
     * @param {function} makeRequestAgain - This is the function that will be called to make the request again when all of the handlers
     * have been fired. This will guarantee that however is making the request will be able to get the response it needs.
     */
    async function fireHandlers(response, makeRequestAgain) {
        const responses = []
        for (const callback of Object.values(callbacks)) {
            responses.push(callback(response, makeRequestAgain))
        }
        await Promise.all(responses)
    }

    return {
        addCallback,
        fireHandlers
    }
}

const initializedExceptionObserver = exceptionObserver()

export { initializedExceptionObserver as exceptionObserver }

/**
 * This will return an object with the `Authentication` key and then the authentication bearer with the token.
 * 
 * @param {string} token - The token that we want to use to authenticate. Can be an access token or a refresh token.
 * 
 * @returns {object} - The object with the authentication bearer.
 */
export function setTokenInHeader(token) {
    if (!['', null, undefined].includes(token)) {
        return {
            Authorization: `${BEARER} ${token}`
        }
    } else {
        return {}
    }
}

/**
 * Retrieves the refresh token from the localstorage or from the async storage.
 * 
 * @returns {string} - The refresh token.
 */
export async function getRefreshToken() {
    if (APP === 'web' && localStorage !== undefined) {
        return localStorage.getItem('refreshToken')
    } else if (APP === 'mobile') {
        return await AsyncStorage.getItem('refreshToken')
    }
}

/**
 * This will retrieve the token from the localstorage or from the async storage if it's in a mobile environment
 * 
 * @returns {Promise<string>} - The token to use in the request.
 */
export async function getToken() {
    if (APP === 'web' && localStorage !== undefined) {
        return localStorage.getItem('token') 
    } else if (APP === 'mobile') {
        return await AsyncStorage.getItem('token')
    }
}

/**
 * This will set the accessToken and the refreshToken on the localstorage or on the asyncStorage if we are in the mobile
 * environment.
 * 
 * @param {string} accessToken - The access token to set. This will be set to `token` on the localstorage or on 
 * the asyncStorage.
 * @param {string} refreshToken - The refresh token to set. This will be set to 'refreshToken' on the localstorage or 
 * on the asyncStorage.
 */
export async function setTokens(accessToken, refreshToken) {
    if (APP === 'web' && localStorage !== undefined) {
        localStorage.setItem('token', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
    } else if (APP !== 'web') {
        await AsyncStorage.setItem('token', accessToken)
        await AsyncStorage.setItem('refreshToken', refreshToken)
    }
}

/**
 * This will remove the tokens from the localstorage because the user is not logged in anymore.
 */
export async function removeTokens() {
    if (APP === 'web' && localStorage !== undefined) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
    } else if (APP === 'mobile') {
        await AsyncStorage.removeItem('token')
        await AsyncStorage.removeItem('refreshToken')
    }
}