const Event = require('../../../palmares/events')
const { settings } = require('../../../palmares/conf')

const path = require('path')

/** 
 * This has nothing to do with the framework itself but something implemented inside of reflow itself.
 * The event levarages nodejs event emitter bultin the language itself.
 * 
 * Why we built on top of reflow and not the framework?
 * 
 * Because we need to have a way to validate the events emitted and follow a strict rule. By doing this we will
 * guarantee all of the data recieved
 * 
 * Okay, so how does it work and how do we use this?
 * 
 * First, you will notice that the module.exports at the end of this file exports the class instance and NOT 
 * the class definition, you will might ask why, that's because we want the api to already be initialized when you use it.
 * 
 * So what's the interface on interacting with the API?
 * 
 * ```
 * const events = require('../core/events')
 * 
 * events.emit('trackUser', {
 *      userId: 1,
 *      companyId: 2
 * })
 * ```
 * 
 * This above is how we fire a new event to the consumers. But how does the consumers work you might ask?
 * 
 * consumers are nothing more than simple classes that does not inherit anything
 * 
 * ```
 * class AnalyticsEvent {
 *      async trackUser(data, transaction) {
 *          // do something with the transaction
 *      }
 * }
 * ```
 * 
 * The class above is a simple class that will recieve the events, do you see the name of the method? If you look closesly
 * the name of the method is the same as the name of the event. This is on purpose since we want to make it clear for programmers
 * what eventNames does the handler recieves and work on.
 * 
 * Besides that we also validate the payload that is being sent to the handler. So we guarantee that your handler
 * Will always recieve the SAME payload formatted.
 * 
 * Last but not least the framework itself handles sends a transaction so your transactions are enclosed if some error happens when sending
 * the event then we guarantee your data will not be saved.
 * 
 * Be aware that those events are asynchronous, so if anything fail it will not affect the request at all.
 * 
 * HOW TO DEFINE EVENTS??
 * 
 * In settings.js you will find the `EVENTS` variable, this is variable used for Reflow itself and NOT the framework. This
 * is a big object like:
 * ```
 * const EVENTS = {
 *      trackCompany: {
 *          dataParameters: ['payload'],
 *          consumers: [require('./analytics/events').AnalyticsEvents]
 *      },
 *      trackUser: {
 *          dataParameters: ['hey', 'ho'],
 *          consumers: [require('./analytics/events').AnalyticsEvents]
 *      }
 * }
 * ```
 * 
 * The first keys: `trackCompany` and `trackCompany` are the name of the events, this mean you can register either the
 * `trackCompany` or `trackUser` events, if you try to register any other event it will fail. This make it clear for programmers
 * what event we are able to handle.
 * 
 * After that we have two keys: `dataParameters` and `consumers`. The first one are the parameters it recieve, this means that 
 * when emitting an event you NEED to pass those parameters even if you don;t use them in some handler. Why? Because your handlers
 * depend on it so if you pass incomplete or with more parameters than it should it would lead to inconsistencies, and since
 * we will have many handlers handling the same event we can't have inconsistencies.
 * 
 * The second argument is `consumers`, those are the classes that you defined that will handle this event, if you haven't implemented
 * the handler of the event name you are firing then the event will fail. Make sure the classes you added to consumer have
 * the proper method to handle the event.
 * 
 * This makes it clear for programmers two things: What events does the application fire and the structure of the events.
 * We have consistency and clarity. Then if anyone sees the code they will have a quick and simple understanding.
 */
class BaseEvent extends Event {
    constructor () {
        super()
        this.eventNames = []
        this.setupEvents()
    }
    
    /**
     * Why validate the payload on the request and not the emit?
     * 
     * Because if programmers want they can bypass the validation by calling `.emit` direclty.
     * This can lead to inconsistencies and since consistency is important we define this here
     * when event is processed. 
     * 
     * @param {Array<string>} dataFormat - An array of strings, each string is each key of the payload
     * @param {Function} callback - The function that will actually handle this event.
     * 
     * @returns {Function} - This is kinda confusing but we call this method to retrieve a function, we call
     * the method to set up everything it needs in order to work. Then we return a function, this function is
     * the handler that will be on top of the callback (the callback itself is what will handle the event)
     */
    validatePayload(dataFormat, callback) {
        return async (...args) => {
            const data = args[0]
            if (dataFormat.some(parameter => !data[parameter])) {
                throw new Error(`You should pass the following parameters: ${dataFormat.join(', ')}`)
            }
            await Promise.resolve(callback(...args))
        }
    }

    /**
     * When initizalize the class we setup the `.on` handlers for each consumer.
     * 
     * This will handle the validation and everything it needs in order to work.
     * 
     * As said before, if your consumer does not have the method defined it will fail.
     * 
     * luckly it will fail during the initialization process of the application so you won't
     * release anything buggy.
     */
    setupEvents() {
        Object.entries(settings.EVENTS).forEach(([eventName, event]) => {
            this.eventNames.push(eventName)
            event.consumers.forEach(eventConsumer => {
                const eventPath = eventConsumer.split('/')
                const eventClassName = eventPath.pop()
                const toRequire = path.join(settings.BASE_PATH, ...eventPath)
                const requiredFromPath = require(toRequire)
                let eventClass = null
                if (requiredFromPath.name === eventClassName) {
                    eventClass = requiredFromPath
                } else {
                    eventClass = requiredFromPath[eventClassName]
                }
                const handler = new eventClass()
                if (handler[eventName]) {
                    this.on(eventName, this.validatePayload(event.dataParameters, handler[eventName].bind(handler)))
                } else {
                    throw new Error(`You should add the '.${eventName}()' method in ${handler.constructor.name}`)
                }
            })
        })
    }

    /**
     * Emits the event, if the event is not registered than it will fail
     * so make sure that you define the event and it's consumers first in `EVENTS` before continuing and trying to use.
     * 
     * @param {string} eventName - The name of the event to be fired.
     * @param {object} data - The object following the format defined in `dataParameters` property of your event.
     */
    async emit(eventName, data) {
        if (this.eventNames.includes(eventName)) {
            super.emit(eventName, data)
        } else {
            throw new Error(`The event ${eventName} is not registered in EVENTS in 'settings.js'. You can only emit the following events: ${this.eventNames.join(', ')}`)
        }
    }
}


module.exports = new BaseEvent()