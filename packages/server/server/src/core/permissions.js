const { settings } = require('../../../palmares/conf')
const { HTTP_404_NOT_FOUND } = require('../../../palmares/status')

const path = require('path')

let permissionClassesCache = {}


class PermissionsError extends Error {
    constructor({reason, detail="The resource you are trying to find doesn't exist.", status=HTTP_404_NOT_FOUND} = {}) {
        super(JSON.stringify({reason, detail, status}))
    }
}
/**
 * The class to be extended in your custom permissions, you need to override both methods in order to work.
 * 
 * Don't do any heavy work on `.init(req)` function, make it as simple as possible just to check if we can use this
 * permission to validate the request or not.
 */
class Permission {
    init(request) {
        return false
    }

    async handle(request) {}
}

/**
 * This function is responsible for handling and validating permissions directly from the request.
 * Usually you will use this function inside of middlewares.
 * 
 * MOTIVATION:
 * This project is built with descentralization in mind. Although it is a Monolithic app, we want to make all of the apps independent from
 * each other as deep as possible. With this function you can decentralize the hole permissions case when the user makes a new request. 
 * We create the logic to check for a specific permission on one app. Other apps can 'subscribe' to this permission case so everything 
 * stays descentralized.
 * 
 * 1 - You create a custom class to handle the permissions inheriting from `Permission` class.
 * 2 - The `.init(req)` method of the class is responsible for saying if this request needs to be validated or not, on this function you
 * will return true if you want the request to proceed to the `.handle()` or false if not. The idea is that, not every request should be validated
 * by your permission class, so you define if it needs or don't need to be validated depending on the request. This prevents us from doing unecessary work
 * and you can know exactly what you will be validating on `.handle()` function.
 * 3 - After initializing the class we will call `.handle()`, this function is an ASYNC function that will handle the permission. If what you are trying to do
 * is not permitted then this function must throw either a `PermissionError` or `PermissionPublicError` (this is the contrary, we need to throw if it's permitted)
 * 4 - Register it in settings.js PERMISSIONS object with a custom key, they key must be a array in this case. And the ordering in this list is REALLY
 * important because it says what we will call first and what we will validate last.
 * 5 - When we recieve a request that uses this `validatePermissionsFromRequest` function we import each class permission that were defined in PERMISSIONS
 * in settings.js. When we import this class, we run your class first by validating `.init(req)` and then, if valid, callind `.handle(req)`
 * 
 * EXAMPLE:
 * Okay, so all of this stuff defined above might not be so clear so let's use an example.
 * ```
 * class AuthenticationPermission extends Permission {
 *      init(req) {
 *          if (req.user !== null || req.params.companyId !== undefined || req.params.userId !== undeinfined) return true
 *          return false
 *      }
 * 
 *      async handle (req){
 *          const userId = req.params.userId !== undeinfined ? req.params.userId : req.user.id
 *          
 *          const user = User.AUTHENTICATION.userById(userId)
 *          const company = Company.AUTHENTICATION.companyById(req.params.companyId)
 * 
 *          if (!(this.isValidCompay(company) && this.isValidUserCompany(company, user) && this.isValidAdminOnlyPath(user, req.options)) {
 *              throw new PermissionsError({detail: 'invalid', status: 404})
 *          }
 *      }
 * }
 * ```
 * 
 * The class above is a custom permission class that will validate all of the permissions about authentication. First we define the `init` of this class.
 * This class recieves one argument in order to validate: `req`. After that, as said before, we call the created object `.handle(req)` function
 * sending the Request object.
 * 
 * After defining this class, on settings.js you will add something like this:
 * 
 * const PERMISSIONS = {
 *      'DEFAULT': [
 *          'src/authentication/permissions/AuthenticationPermission', # we added on this line
 *          'src/authentication/permissions/NotificationPermission'
 *      ]
 * }
 * 
 * The permissions object can hold as many keys as you want, each key is the `permissionType` string that you send as argument
 * to this function. With this we can group the validation not in a single group, but we can actually go through each pipeline
 * as we need it. 
 * 
 * Each key is a list containing the module location with the class that we will use to validate. The ordering here is EXTREMELY important
 * pretty much like the ordering in middlewares.
 * 
 * @param {Express.Request} req - The default request object you usually recieve in your controllers.
 * @param {string} permissionType - The key you want to use in PERMISSIONS variable in `settings.js`, usually the keys
 * in PERMISSIONS is uppercase, but the permissions here can be lowercase
 * 
 * @throws {PermissionError} - if any exception is thrown in the permissions classes.
 */
async function validatePermissionsFromRequest(req, permissionType) {
    const permissionTypeName = permissionType.toUpperCase()
    for (const permission of settings.PERMISSIONS[permissionTypeName]) {
        let permissionClass = null
        if (permissionClassesCache[permission]) {
            permissionClass = permissionClassesCache[permission]
        } else {
            const permissionPath = permission.split('/')
            const permissionClassName = permissionPath.pop()
            const toRequire = path.join(settings.BASE_PATH, ...permissionPath)
            const requiredFromPath = require(toRequire)
            if (requiredFromPath.name === permissionClassName) {
                permissionClass = requiredFromPath
            } else {
                permissionClass = requiredFromPath[permissionClassName]
            }
            permissionClassesCache[permission] = permissionClass
        }
        if (permissionClass !== null) {
            const permissionInstance = new permissionClass()
            if (permissionInstance instanceof Permission && permissionInstance.init(req)) {
                await permissionInstance.handle(req)   
            }
        }
    }
}

module.exports = {
    Permission,
    validatePermissionsFromRequest,
    PermissionsError
}