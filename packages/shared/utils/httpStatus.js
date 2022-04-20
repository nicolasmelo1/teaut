/**
 * This is copied from `palmares/status.js` because we need to use it on the front and on the backend. We will leave the framework as is.
 */

const isInformational = (code) => code >= 100 && code <= 199

const isSuccess = (code) => code >= 200 && code <= 299

const isRedirect = (code) => code >= 300 && code <= 399

const isClientError = (code) => code >= 400 && code <= 499

const isServerError = (code) => code >= 500 && code <= 599


module.exports = {
    isInformational,
    isSuccess,
    isRedirect,
    isClientError,
    isServerError
}