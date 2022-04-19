const EventEmitter = require('events')

const { getEngineInstance } = require('./database')

/**
 * This is an event handler that works like a singleton for your hole application, whenever you start
 * a new instance the instance is preserved and we can fire events for the hole application.
 */
class Event {
    constructor() {
        this.eventEmitter = new EventEmitter()
        if (Event.instance instanceof Event) {
            this._instance = Event.instance
        } else {
            Event.instance = this
            this._instance = this
        }
    }

    /**
     * This bounds every new event to a transaction so you can use the transaction from the engine you are using
     * directly in your event listeners
     * 
     * This adds the `transaction` argument as the last argument of every listener function
     * 
     * event.on('event', function listOptions(param1, param2) {
     *      // do something in your handler
     * })
     * 
     * You will rewrite the above as
     * event.on('event', function listOptions(param1, param2, transaction) {
     *      // do something in your handler
     * })
     */
    boundTransactionToEvents(functions) {
        let newFunctions = []
        for (const handler of functions) {
            async function transactionHandler(...args) {
                const callback = async (...callbackArgs) => {
                    const response = handler(...callbackArgs)
                    if (response instanceof Promise) {
                        return await response
                    } else {
                        return response
                    }
                }
                getEngineInstance().transaction(callback, ...args)
            }
            newFunctions.push(transactionHandler.bind(handler))
        }
        return newFunctions
    }

    on(eventName, ...args) {
        const functions = this.boundTransactionToEvents(args.filter(handler=> typeof handler === 'function'))
        this._instance.eventEmitter.on(eventName, ...functions)
    }

    emit(eventName, ...args) {
        this._instance.eventEmitter.emit(eventName, ...args)
        this._instance.eventEmitter.emit(`${eventName}*`, ...args)
        this._instance.eventEmitter.emit('*', ...args)
    }
}

module.exports = Event