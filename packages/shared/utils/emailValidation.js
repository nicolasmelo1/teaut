/**
 * Verifies if the given string is a valid email address.
 * 
 * Reference: https://stackoverflow.com/a/9204568
 * 
 * @param {string} email - The email to verify.
 * 
 * @returns {boolean} - True if the email is valid, false otherwise.
 */
module.exports = function emailValidation(email) {
    return /\S+@\S+\.\S+/.test(email)
}