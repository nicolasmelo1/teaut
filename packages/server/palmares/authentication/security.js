/**
 * @module config/authentication/security
 */

const path = require('path')
const {} = require('./hashers')
const { settings } = require('../conf')

class SecurityError extends Error {}

/**
 * Retrives all the hashers to be used to validate the token, this is only used to validate the password
 * and not to create a new one. To create a new password we always use the first hash.
 * 
 * @returns {Array} - Returns an array of hashers.
 */
const getPasswordHashers = () => {
    const defaultPasswordHashers = [
        path.join(__dirname, 'hashers', 'PBKDF2Hasher')
    ]

    let passwordHashers = defaultPasswordHashers
    if (settings.PASSWORD_HASHERS && settings.PASSWORD_HASHERS.length > 0) {
        passwordHashers = settings.PASSWORD_HASHERS
    }
    return passwordHashers
}

/**
 * Retrieves a Hasher class, check ./hashers for further reference on how hashers work.
 * 
 * @param {String} passwordHasherPath - The path to the hasher, the last string is the Hasher itself so we split it.
 * @returns {config/authentication/hashers/BaseHasher} - Returns a BaseHasher class or a class derived by that class.
 */
const getHasher = (passwordHasherPath) => {
    const splittedHasher = passwordHasherPath.split('/')
    const algorithm = splittedHasher.pop()
    let hasher = require(splittedHasher.join('/'))
    hasher = hasher[algorithm]
    if (hasher) {
        return hasher
    } else {
        throw new SecurityError(`Invalid hasher ${algorithm} defined in PASSWORD_HASHERS array.`)
    }
}

/**
 * This mimics the Django implementation of passwords so:
 * - first it is secure
 * - second the passwords of the users will work with this implementation
 * 
 * Reference: https://docs.djangoproject.com/en/3.2/topics/auth/passwords/#how-django-stores-passwords
 * 
 * @param {String} rawPassword - The raw password string, this is what the user types in the front-end.
 */
const makePassword = (rawPassword) => {
    const passwordHashers = getPasswordHashers()
    
    if (passwordHashers.length > 0) {
        const hasher = getHasher(passwordHashers[0])
        const hasherInstance = new hasher()
        return hasherInstance.encode(rawPassword)
    }
}

/**
 * Similar to django we check the password on all of the hashers, this way we can keep many hashing algorithms living
 * in the database and validate all of them.
 * 
 * @param {String} password - The raw password string, this is what the user types in the front-end.
 * @param {String} encoded - The encoded password from our database.
 * 
 * @returns {Boolean} - Nothing much to talk about, returns true if the password is valid and false if not.
 */
const checkPassword = (password, encoded) => {
    if (encoded) {
        const algorithm = encoded.split('$', 1)[0]

        if (algorithm) {
            const passwordHashers = getPasswordHashers()
            for (const passwordHasher of passwordHashers) {
                const hasher = getHasher(passwordHasher)
                if (hasher.hasherName === algorithm) {
                    const hasherInstance = new hasher()
                    return hasherInstance.verify(password, encoded)
                } 
            }
        }
    }
    return false
}

/**
 * You can have many hashers and you can make changes to them to make them more strong from time to time. That's the 
 * idea at least.
 * 
 * @param {String} password - The raw password string, this is what the user types in the front-end.
 * @param {String} encoded - The encoded password from our database.
 * 
 * @returns {String} - Returns either a string of the new password, or just the old password if it is already updated.
 */
const upgradePassword = (password, encoded) => {
    const algorithm = encoded.split('$', 1)
    const defaultPasswordHasher = getPasswordHashers()[0]
    const defaultHasher = getHasher(defaultPasswordHasher)
    if (defaultHasher.hasherName !== algorithm) {
        return defaultHasher.encode(password)
    } else {
        return encoded
    }
}

module.exports = {
    upgradePassword,
    checkPassword,
    makePassword
}
