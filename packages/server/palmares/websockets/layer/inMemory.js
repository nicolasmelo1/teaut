const ChannelLayer = require('./index')

const EventEmitter = require('events')


class InMemoryChannelLayer extends ChannelLayer {
    constructor() {
        super()
        this.eventEmitter = new EventEmitter()
    }

    async publish(groupName, message) {
        this.eventEmitter.emit(groupName, JSON.stringify(message))
    }

    async subscribe(groupName, callback) {
        this.eventEmitter.on(groupName, (message) => {
            callback(JSON.parse(message))
        })
    }

    async unsubscribe(groupName) {
        this.eventEmitter.removeAllListeners([groupName])
    }
}

module.exports = InMemoryChannelLayer