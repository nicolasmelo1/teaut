const ChannelLayer = require('./index')
const { settings } = require('../../conf')

const Redis = require('ioredis')


class RedisLayer extends ChannelLayer {
    constructor() {
        super() 
        this.redisClient = new Redis(settings?.WEBSOCKET?.LAYER?.CONFIG?.host || 'localhost:6379')

        process.on('SIGINT', async () => {
            if (this.redisClient) {
                console.log('RedisChannelLayer is closing connection to redis.')
                await this.close()
            }
        })
    }

    async publish(channel, message) {
        const publisherClient = this.redisClient.duplicate()

        return new Promise((resolve, reject) => {
            publisherClient.publish(channel, JSON.stringify(message), (err, res) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(res)
                }
            })
        })
    }

    async subscribe(channel, callback) {
        if (this.subscriberClient === undefined) {
            this.subscriberClient = this.redisClient.duplicate()
        }

        return new Promise((resolve, reject) => {
            this.subscriberClient.subscribe(channel, (err, res) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(res)
                }
            })
            this.subscriberClient.on('message', (channel, message) => {
                callback(JSON.parse(message))
            })
        })
    }

    async unsubscribe(channel) {
        this.subscriberClient.unsubscribe(channel)
    }

    async close() {
        try {
            await this.redisClient.quit()
        }
        catch(e) {
            console.log(e)
        }
    }
}

module.exports = RedisLayer