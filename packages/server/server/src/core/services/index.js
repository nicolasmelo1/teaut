/**
 * This is used to format the json response for errors. This way whenever an error happens inside of reflow
 * we will send the EXACTLY SAME json response. We do not format the response for non errors but it's known to 
 * be already padronized as `{ status: 'ok', data: {} }` and adding `pagination` when needed. But for errors, it's not padronized.
 * So to prevent many error responses we padronize it here.
 * 
 * @param {object} jsonData - The json data to be sent when an error happens.
 * @param {string} jsonData.reason - This is a machine readable string that describes the error. So no accents no spaces and no new lines are allowed.
 * @param {string} [jsonData.detail=''] - This is a human readable string that describes the error. So write it as a text to explain to the user what happened.
 * We know it's probably a human and another programmer of reflow that will see this error probably, but it's nice to keep it as descriptive and detailed 
 * as possible.
 * @param {object} [jsonData.metadata={}] - Sometimes only the description and reason are not sufficient so we need to send metadata, metadata can be configured
 * as needed so it can be used to send more information to the user on what went wrong.
 * 
 * @returns {{reason: string, detail: string, metadata: object}} - Returns an object structured to send an error response to the user.
 */
const reflowJSONError = ({reason, detail='', metadata={}} = {}) => { 
    reason = reason.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    reason = reason.replace(/\s/g, '_')
    return {
        reason,
        detail,
        metadata
    }
}

module.exports = {
    reflowJSONError
}