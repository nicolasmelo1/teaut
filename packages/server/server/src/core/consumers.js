const websockets = require('../../../palmares/websockets')


/**
 * Okay, so we've created the consumers and the websockets inside of our framework, why do we do this here and what do we do
 * to handle incoming messages and sending messages.
 * 
 * This was something extracted from the django project before being translated to this node project and that have a similar 
 * interface as it was.
 * 
 * By default we can create consumer classes that will attach to specific routes in our application. We also can add middleware
 * to routes similarly as we do inside our express routes.
 * 
 * We could go with the middleware approach by creating each consumer as a class and attaching it in a specific middleware order
 * inside of each path. The problem with this approach is that: we will recieve all of the messages from the client, how will we dispatch
 * on each consumer what we want to handle?
 * 
 * We don't that's why we need a default structure in our massages so we can dispatch it to the correct consumers. At the same time, each consumer
 * creates it's own group so it can recieve and listen from messages from the layers and dispatch to the connected clients.
 * 
 * Anyway, it can become complex really quickly, but i could also make it work using the middleware approach. Although the middleware
 * approach is good, it might not be clear for the programmer since you won't be using 'settings' but instead appending to `routing` directly
 * so it might not be so clear for the programmers what are the consumers, what routes are they appended to and so on. But keep in mind
 * we can also change this anytime. For the middleware approach to work every consumer would extend from a givin consumer class here and 
 * add the proper `recieve` or `send` methods to it. Then on the base class we will check if `this` have the method `recieve${data.type}` and dispatch
 * the method to the consumer. You should also override the send so all consumers doesn;t handle the same send event since they are all connected
 * to the same group.
 * 
 * ANYWAY, back on how the consumers work.
 * 
 * To create a new base consumer you should extend from the BaseConsumer class and define it here.
 * You will create it like:
 * 
 * ```
 * class UserConsumer extends BaseConsumer {
 *      static groupNameTemplate = 'user_{id}'
 *      consumers = {
 *          ...getMethodsByConsumer('LOGIN_REQUIRED')
 *      }
 * 
 *      static async send(eventName, userId, data) {
 *          this.groupName = UserConsumer.groupNameTemplate.replace('{id}', userId)
 *          await super.send(eventName, this.groupName, data)
 *      }
 * 
 *      async connect(scope, next) {
 *          if (scope.user && ![null, undefined].includes(scope.user)) {
 *              this.groupName = UserConsumer.groupNameTemplate.replace('{id}', scope.user.id)
 *              await super.connect(scope, next)
 *          } else {
 *              throw new websockets.DenyConnection('For `user` group types, your user must be authenticated')
 *          }
 *      }
 * }
 * ```
 * 
 * See that `consumers` on the 3º line is required in order for it to work. You also should define your own custom `connect` method 
 * so you can create group names dynamically. 
 * 
 * Do you see we have a custom static send method? This is because we want to be able to send messages to a specific user without
 * initializing the class. This automatically broadcast the message to all consumers so it's simple to send the message.
 * 
 * Okay, i understand how i can create custom consumers, so how do we override this consumer and create custom consumers?
 * Remember that `consumers` object is obligatory in your class? See the `getMethodsByConsumer('LOGIN_REQUIRED')` part.
 * 
 * Whet we do is that on `settings.js` we define the consumers we want to override as a string in a particular key like:
 * ```
 * const CONSUMERS = {
 *      LOGIN_REQUIRED: [
 *          'src/data/consumers/DataConsumer',
 *          'src/billing/consumers/BillingConsumer',
 *          'src/authentication/consumers/AuthenticationConsumer'
 *      ],
 *      PUBLIC: [
 *          'src/draft/consumers/DraftPublicConsumer',
 *      ],
 * }
 * ```
 * 
 * See that we have a key called `LOGIN_REQUIRED` and we have an array of strings with the paths to the consumers we want to use, also see that we have
 * the key `PUBLIC` for another pair of consumers.
 * 
 * Okay, nice, so how do we create a custom consumer in our application?
 * Like this:
 * ```
 * const AuthenticationConsumer = {
 *      recieveMessage: async (scope, data) => { // you can follow either this format for defining your functions
 *          console.log(data)
 *      },
 *      async sendTeste(scope, data, send) { // or this format for defining your functions
 *          send(data)
 *      }
 * }
 * 
 * module.exports = {
 *      AuthenticationConsumer // You should export it like this, don't ever export your consumer like ```module.exports = AuthenticationConsumer```
 * } 
 * ```
 * 
 * Firt things first: Your custom consumer is not a class, but a simple object. Second you have 2 functions: `recieveMessage` and `sendTeste`
 * when your function have the `recieve` keyword, this means your function will recieve the data from the client that had the following `type`. Be
 * aware that `type` key is required in the object you send and the object you recieve.
 * We send a data like
 * ```
 * {
 *    type: 'message',
 *    data: { hello: 'world'}
 * }
 * ```
 * We use the 'type' part on the data to dispatch it to the correct consumers. Then again, if your function have the `recieve` keyword this function
 * will handle when it recieves a data from the client. When it has the `send` keyword this means we will override how we send the data to the user.
 * If no function is found it just send the data to the client normally. 
 * 
 * Last but not least, how do we send data to the client easily? Use the static `send` method. (it's not the same as the non static `send` method)
 * ```
 * UserConsumer.send('teste', 1, { hello: 'world'}) // This will send for the group `user_1` the data { hello: 'world'}
 * UserConsumer.send('teste', 2, { hello: 'world2'}) // This will send for the group `user_2` the data { hello: 'world2'}
 * 
 * BaseConsumer.send('teste', 'user_2', {hello: 'world2'}) // Same as the previous example
 * ```
 * 
 * See that by doing this we append the `type` to the event directly so you don't need to worry about it when sending events.
 */
class BaseConsumer extends websockets.Consumer {
    /**
     * Recieves the data following the structure:
     * ```
     * {
     *    type: 'message',
     *    data: { hello: 'world'}
     * }
     * ```
     * but as a string, then we convert to JSON and dispatch to the correct handler.
     * 
     * @param {string} data - The data recieved as a string.
     */
    async recieve(data) {
        if (typeof(data) === 'string') {
            data = JSON.parse(data)
        }

        if (typeof(data) === 'object' && data && data.type) {
            const method = `recieve${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`
            if (this[method] !== undefined) {
                this[method](data)
            }
        } else {
            super.send(JSON.stringify({
                status: 'error',
                error: {
                    reason: 'invalid_data',
                    detail: '`type` attribute is required in data and it should be a json object'
                }
            }))
        }
    }

    /**
     * Overrides the default `send` method so this way we can dispatch the send event by each consumer
     * if the consumers have any handler for this type of send event. Otherwise just send it normally.
     * 
     * @param {object} data - The actual data that we want to send. Usually this is used when you call the layers
     * to broadcast the message.
     * 
     * @throws {Error} If the `type` attribute is not found in the data.
     */
    async send(data) {
        try {
            if (data && data.type) {
                const method = `send${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`
                if (this[method] !== undefined) {
                    this[method](data, super.send.bind(this))
                }
            } else {
                throw new Error('`type` attribute is required in data')
            }
        } catch (e) {
            super.send(JSON.stringify({
                status: 'error',
                error: {
                    reason: 'invalid_data',
                    detail: '`type` attribute is required in data and it should be a json object'
                }
            }))
        }
    }

    /**
     * A method DIFFERENT that the non static `send` method. This automatically adds the `type` to your object
     * and also automatically broadcast your event to all consumers. This make it easier to send data to the client.
     * 
     * @param {string} eventName - The name of the event you want to send the data.
     * @param {string} groupName - The group for which you want to send the data to.
     * @param {object} data - The actual data that you want to send.
     * 
     * @throws {Error} - If the `data` is not an object.
     */
    static async send(eventName, groupName, data) {
        if (typeof data === 'object') {
            // Need to create a new object because we update by reference.
            // If we changed the actual `data` object other places where `data` is used
            // would be affected.

            // For example, if we have a AnalyticsEvents in `analytics` and AuthorizationBroadcastEvent in `authorization`
            // the data recived by `companyInformationUpdated` in `analytics` would contain the `type` attribute although
            // we are not using websockets in this function.
            const newData = {
                type: eventName,
                data: data
            }
            websockets.layer.publish(groupName, newData)
        } else {
            throw new Error('`data` should be an object')
        }
    }
}

/**
 * Handles the authenticated users and their specific groups, when the user is logged in we use this consumer to send and
 * recieve data from the user so we can safely handle and dispatch for the consumers.
 * 
 * This uses the `LOGIN_REQUIRED` key in the CONSUMERS in settings.js file. So we use all of the consumers from this list.
 * 
 * We override the static `send` method so you don;t need to worry about the template of the groupName, you just send the 
 * userId noarmally.
 */
class UserConsumer extends BaseConsumer {
    static groupNameTemplate = 'user_{id}'

    static async send(eventName, userId, data) {
        this.groupName = UserConsumer.groupNameTemplate.replace('{id}', userId)
        await super.send(eventName, this.groupName, data)
    }

    async connect(scope, next) {
        if (scope.user && ![null, undefined].includes(scope.user)) {
            this.groupName = UserConsumer.groupNameTemplate.replace('{id}', scope.user.id.toString())
            await super.connect(scope, next)
        } else {
            throw new websockets.DenyConnection('For `user` group types, your user must be authenticated')
        }
    }
}


module.exports = {
    UserConsumer
}