const { settings } = require('../../../../palmares/conf')

const reallydangerous = require('reallydangerous')

/**
 * This class is used so we can encrypt and decrypt the data passed to the url. This use a package called reallydangerous 
 * for it`s usage.
 * 
 * So in case we have a companyId in the url, on the url it shows something like ASQ.hu123iohu123HLIh1hl2i312, so the companyId
 * can`t be easily guessed by a common user.
 * 
 * When the function recieves a request it uses
 *
 * > Encrypt.decrypt(companyId)
 * // 2 
 * 
 * so it gets this string, decrypts and get a number. Finally it responds for the user encrypting the data that needs to be encrypted
 */
class Encrypt {
    
    /**
     * Used for decrypting the data, the data should be urlsafe, so safe to be used in the urls, for that reason we decode and encode
     * in base64 this way it become safe to be used in the urls.
     * 
     * @param {String} encryptedString - This is a signed value encoded to base64. This will be decrypted.
     * 
     * @returns {(String|null)} - Returns either the string decrypted or null
     */
    static decrypt(encryptedString) {
        const signer = new reallydangerous.Signer(settings.SECRET_KEY)
        
        try {
            return JSON.parse(signer.unsign(reallydangerous.Base64.decode(encryptedString)))
        } catch (e) {
            return null
        }
    }

    /**
     * Encrypts a data in a urlsafe format, this url safe format is a base64 encoded string of a signed data.
     * 
     * @param {Any} toBeEncrypted - This is the value you want to encrypt.
     *  
     * @returns {String} - Returns the value JSON.stringfied, signed and encoeded to base64.
     */
    static encrypt(toBeEncrypted) {
        const signer = new reallydangerous.Signer(settings.SECRET_KEY)

        return reallydangerous.Base64.encode(signer.sign(JSON.stringify(toBeEncrypted)))
    }
}

module.exports = Encrypt