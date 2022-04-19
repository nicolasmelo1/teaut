/**
 * @module config/authentication/user
 */

const { makePassword, checkPassword } = require('./security')
const { models } = require('../database')


class AbstractUserManager extends models.Manager {
    async authenticate(username, password) {
        const user = await this.instance.findOne({
            where: {
                username: username
            }
        })
        if (user) {
            if (checkPassword(password, user.password)) {
                return user
            }
        }
        return null
    }

    async setPassword(user, password) {
        user.password = makePassword(password)
        return user
    }
}

/**
 * This holds all of the default definition for users so you, the programmer
 * will not have to worry much about it, this will be underlined the User model.
 */
class AbstractUser extends models.Model {    
    attributes = {
        lastLogin: new models.fields.DatetimeField({allowNull: true}),
        username: new models.fields.CharField({maxLength: 150, unique: true}),
        password: new models.fields.CharField({maxLength: 150, allowNull: true})
    }

    options = {
        abstract: true
    }

    base = new AbstractUserManager()
}

module.exports = AbstractUser