/**
 * @module config/authentication/hashers
 */

const crypto = require('crypto')

/**
 * Generates a random salt for the password, this way if no salt is provided we can guarantee our own salt.
 * @returns {String} - The random salt generated.
 */
const randomSalt = () => {
    const numberOfBytes = parseInt(Math.abs(Math.random() * (20 - 10) + 10))
    return crypto.randomBytes(numberOfBytes).toString('hex')
}

/**
 * This mimics the Django implementation of passwords so:
 * - first it is secure
 * - second the passwords of the users will work with this implementation
 * 
 * Be aware that you can always create your own hashers. For example, you can implement
 * a Argon2 hasher if you'd like. Or a Bcrypt hasher.
 * 
 * You can set the hashers by the 'PASSWORD_HASHERS' setting in settings.js. If it is not defined we will
 * use the PBKDF2Hasher by default.
 * 
 * To create a new password we will always use the first hasher in the array of hashers, to validate we will
 * use all of the hashers available.
 * 
 * Reference: https://docs.djangoproject.com/en/3.2/topics/auth/passwords/#how-django-stores-passwords
 */
class BaseHasher {
    static hasherName = ''

    /**
     * Encodes a password to something FOR THE DATABASE, this is important, this should be a structure that 
     * the database can understand and interpret.
     */
    encode(password, salt){}

    decode(encoded){}

    verify(password, encoded){}
}

/**
 * Used for creating and verifying PBKDF2 passwords. THis was needed because after that project we were using django.
 * Since django encodes everything as PBKDF2 by default this will be the only hasher we will be implementing for
 * now, but be aware that you can always create your own hashers. For example, you can implement
 * a Argon2 hasher if you'd like.
 */
class PBKDF2Hasher extends BaseHasher {
    static hasherName = 'pbkdf2_sha256'
    
    /**
     * Encodes a password to something FOR THE DATABASE, this is important, this should be a structure that 
     * the database can understand and interpret.
     * 
     * @param {String} password - The password to encode.
     * @param {String} salt - The salt to use. Optional, and if null we will generate a random salt.
     * @param {String} iterations - The number of iterations to use. Optional, and if null we will randomize the
     * number of iterations
     * 
     * @returns {String} - The encoded password.
     */
    encode(password, salt=null, iterations=null) {
        const digest = 'sha256'

        if (iterations === null) iterations = parseInt(Math.abs(Math.random() * (300000 - 100000) + 100000))
        if (salt === null) salt = randomSalt()
        const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, digest).toString('base64')

        const encodedPassword = `${PBKDF2Hasher.hasherName}$${iterations}$${salt}$${hash}`
        return encodedPassword
    }

    /**
     * Function to decode a function, it doesn't decode the actual passwotd because it can't be decoded
     * it just extracts in a way that we can use it to verify the password.
     * 
     * @param {String} encoded - The encoded password.
     * 
     * @returns {Object} - The decoded password.
     */
    decode(encoded) {
        const [_, iterations, salt, hash] = encoded.split('$')
        return {
            iterations: parseInt(iterations),
            salt: salt,
            hash: hash
        }
    }

    verify(password, encoded) {
        const decodedPassword = this.decode(encoded)
        const encodedRaw = this.encode(password, decodedPassword.salt, decodedPassword.iterations)
        return encodedRaw === encoded
    }
}

module.exports = {
    BaseHasher,
    PBKDF2Hasher
}