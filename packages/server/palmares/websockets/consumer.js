const logger = require('../logging')

/** 
 * This observer works for every websocket connection so we DO NOT reach the memory limit of event listeners.
 * 
 * This will append every consumer to the `consumerSubscribers` array and then when we receive a message from the websocket connection
 * we will loop though this array sending the message to all of the consumers.
 */
class ConsumersObserver {
    constructor(websocket) {
        this.websocket = websocket
        this.consumerSubscribers = []
    }

    static async initialize(websocket) {
        const instance = new ConsumersObserver(websocket)
        await instance.setupListener()
        return instance
    }

    async appendSubscriber(subscriber) {
        this.consumerSubscribers.push(subscriber)
    }

    /**
     * This will setup a single listener for the websocket connection, this observer exists for EACH websocket connection. This means that
     * if there is a user A, and a user B and both are connected to the same URL, we have 2 websocket connections, and each of them will have
     * their own observer class defined with their own set of subscribers.
     * 
     * When a message is recieve we loop trough all of the subscribers and then send the message to all of them. We also log a warn if any of 
     * your listeners ARE NOT async. Being async will guarantee that the function call enters the event loop and will not block the loop on all
     * of the subscribers.
     */
    async setupListener() {
        this.websocket.on('message', async (message) => {
            for (const subscriber of this.consumerSubscribers) {
                const expectedPromiseResponse = subscriber.recieve(message)
                if ((expectedPromiseResponse instanceof Promise) === false) {
                    logger.WARN.SHOULD_BE_A_PROMISE(subscriber.constructor.name)
                }
            }
        })
    }
}

/**
 * Handy class for creating consumers instead of creating simple function, this enables you to 
 * extend consumers and override the methods as you wish.
 * 
 * This automatically does everything for you.
 * 
 * `.recieve` should be overridden to handle the incoming message.
 */
class Consumer {
    constructor(websocket) {
        this.websocket = websocket
    }
    
    async recieve(data) {
        logger.WARN.SHOULD_OVERRIDE_RECIEVE_METHOD(this.constructor.name)
    }

    async send(data) {
        return this.websocket.send(JSON.stringify(data))
    }

    /**
     * Instead of defining the listener inside here we create the listener on a `ConsumersObserver` instance so we can loop through all of the consumers
     * and send the message to all of them. This way we do not get `MaxListenersExceededWarning` errors.
     * 
     * This observer will exist for each open websocket connection. The problem is not for multiple connections, but if a same url have multiple consumers.
     * Since we use the middleware pattern similar to routes we can have multiple consumers listening for events. If we have for example a route of more than
     * 11 consumers we will reach the memory limit of event listeners. So by making this we mitigate errors and make it less error prone. Of course,
     * this is available only in Class Based consumers, for function based consumers we can't do this and the user will need to this himself. Since this is our
     * framework we will use Class Based Consumers ONLY.
     * 
     * If you are in doubt, create the following code in your routing:
     * ```
     * const teste = Array.apply(null, Array(20)).map((_, i) => class extends websockets.Consumer {
     *      async recieve(data) {
     *          console.log(data)
     *      }
     * })
     * 
     * const routing = [
     *      path('/websocket/teste', ...teste)
     * ]
     * ```
     * 
     * and then add the following code in the consumer `.connect()` function above the next() function call.
     * ```
     *  this.websocket.on('message', async (message) => { this.recieve(message) })
     * ```
     * 
     * When you send a message you will see that you will recieve this warning:
     * ```
     * (node:59361) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 12 message listeners added to [WebSocket]. Use emitter.setMaxListeners() to increase limit
     * (Use `node --trace-warnings ...` to show where the warning was created)
     * ```
     * 
     * In other words, use the `ConsumersObserver` class to create the listeners.
     * 
     * This function will also by default append the consumer to the group so we can broadcast messages to all of the consumers in the given group.
     * 
     * 
     * @param {object} scope - Similar to a `req` object in your controllers, except that this will hold the data needed for your consumers.
     * @param {function} next - Equal to next() in your controllers. When we call next we will call the next consumer for connecting. If we do not call next
     * then the next consumer will not connect.p
     */
    async connect(scope, next) {
        if (scope.observer === undefined) {
            scope.observer = await ConsumersObserver.initialize(this.websocket)
        } 
        await scope.observer.appendSubscriber(this)
        this.scope = scope
        if (this.groupName) {
            scope.broadcast.appendToGroup(this.groupName, this.websocket, this)
        }
        
        next()
    }
}

module.exports = Consumer