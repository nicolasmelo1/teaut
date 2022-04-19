const defaultLog = () => {
    return `\x1b[32m[palmares]\x1b[0m \x1b[33m${new Date().toISOString()}\x1b[0m`
}

const logger = {
    INFO: {
        USING_SETTINGS: (settingsPath) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Using settings at ${settingsPath}`)
        },
        STARTING_APPLICATION: (appName, port) => {
            console.info(`${appName} listening at http://localhost:${port}`)
            console.info(`Quit the server with CONTROL-C`)
        },
        STOPPING_APPLICATION: (appName) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Stopping application ${appName}`)
        },
        LOADING_DATABASE: () => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Loading models to the engine`)
        },
        CLOSING_DATABASE: () => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Closing database connection.`)
        },
        LOADED_DATABASE: () => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m The engine loaded your models`)
        },
        CREATED_MIGRATION: (fileName, appName) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Successfully generated migration ${fileName} in app ${appName}`)
        },
        NO_MIGRATION: () => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m There are no changes to your models`)
        },
        FINISHED_MIGRATION: () => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Finished running migrations.`)
        },
        REQUEST: (protocol, method, url) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m ${protocol.toUpperCase()} request recieved with method ${method} at ${url}`)
        },
        RESPONSE: (protocol, method, url, time) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m ${protocol.toUpperCase()} response sent to method ${method} at ${url} and took ${time}`)
        },
        RUNNING_MIGRATION: (migrationName) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Running migration ${migrationName}`)
        },
        WEBSOCKET_CONNECTED: (url) => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Websocket connected and recieving messages in ${url}`)
        },
        WEBSOCKET_DISCONNECTED: () => {
            console.info(`${defaultLog()} \x1b[36mINFO\x1b[0m Websocket disconnected`)
        }
    },
    WARN: {
        CANNOT_CONNECT_TO_WEBSOCKET: (url) => {
            console.warn(`${defaultLog()} \x1b[31mWARN\x1b[0m Could not connect to url '${url}'`)
        },
        SHOULD_OVERRIDE_RECIEVE_METHOD: (consumerName) => {
            console.warn(`${defaultLog()} \x1b[31mWARN\x1b[0m You should override 'recieve()' method in '${consumerName}' to recieve messages.`)
        },
        SHOULD_BE_A_PROMISE: (consumerName) => {
            console.warn(`${defaultLog()} \x1b[31mWARN\x1b[0m Your 'recieve()' method in '${consumerName}' should be async for better performance.`)
        }
    }
}

module.exports = logger