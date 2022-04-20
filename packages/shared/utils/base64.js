/**
 * Inspired by: https://github.com/eranbo/react-native-base64/blob/master/base64.js
 */

const keyString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

class Base64 {
    static encode(string) {
        let output = []
        let char1, char2, char3 = ""
        let encode1, encode2, encode3, encode4 = ""
        let i = 0

        while (i <= string.length) {
            char1 = string.charCodeAt(i++)
            char2 = string.charCodeAt(i++)
            char3 = string.charCodeAt(i++)

            encode1 = char1 >> 2
            encode2 = ((char1 & 3) << 4) | (char2 >> 4)
            encode3 = ((char2 & 15) << 2) | (char3 >> 6)
            encode4 = char3 & 63

            if (isNaN(char2)) {
                encode3 = encode4 = 64
            } else if (isNaN(char3)) {
                encode4 = 64
            }

            output.push(
                keyString.charAt(encode1) +
                keyString.charAt(encode2) +
                keyString.charAt(encode3) +
                keyString.charAt(encode4))
            char1 = char2 = char3 = ""
            encode1 = encode2 = encode3 = encode4 = ""
        }

        return output.join('')
    }
    
    static encodeFromByteArray(string) {
        let output = []
        let char1, char2, char3 = ""
        let encode1, encode2, encode3, encode4 = ""
        let i = 0

        while (i <= string.length) {
            char1 = string[i++]
            char2 = string[i++]
            char3 = string[i++]

            encode1 = char1 >> 2
            encode2 = ((char1 & 3) << 4) | (char2 >> 4)
            encode3 = ((char2 & 15) << 2) | (char3 >> 6)
            encode4 = char3 & 63

            if (isNaN(char2)) {
                encode3 = encode4 = 64
            } else if (isNaN(char3)) {
                encode4 = 64
            }

            output.push(
                keyString.charAt(encode1) +
                keyString.charAt(encode2) +
                keyString.charAt(encode3) +
                keyString.charAt(encode4))
            char1 = char2 = char3 = ""
            encode1 = encode2 = encode3 = encode4 = ""
        }

        return output.join('').replace('\0', '').replace('\x00', '')
    }

    static decode(string) {
        let output = ""
        let char1, char2, char3 = ""
        let encode1, encode2, encode3, encode4 = ""
        let i = 0

        // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
        let base64test = /[^A-Za-z0-9\+\/\=]/g
        if (base64test.exec(string) !== null) {
            throw new Error("There were invalid base64 characters in the string text.\n" +
              "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
              "Expect errors in decoding.")
        }
        string = string.replace(/[^A-Za-z0-9\+\/\=]/g, "")

        do {
            encode1 = keyString.indexOf(string.charAt(i++))
            encode2 = keyString.indexOf(string.charAt(i++))
            encode3 = keyString.indexOf(string.charAt(i++))
            encode4 = keyString.indexOf(string.charAt(i++))

            char1 = (encode1 << 2) | (encode2 >> 4)
            char2 = ((encode2 & 15) << 4) | (encode3 >> 2)
            char3 = ((encode3 & 3) << 6) | encode4

            output = output + String.fromCharCode(char1)

            if (encode3 != 64) {
                output = output + String.fromCharCode(char2)
            }
            if (encode4 != 64) {
                output = output + String.fromCharCode(char3)
            }

            char1 = char2 = char3 = ""
            encode1 = encode2 = encode3 = encode4 = ""

        } while (i < string.length) 

        return output.replace('\0', '').replace('\x00', '')
    }

    static isBase64(string) {
        try {
            this.decode(string)
            return true
        } catch {
            return false
        }
    }
}

module.exports = Base64