const path = require('path')
const { settings } = require('../conf')

module.exports = {
    apps: [{
        name: 'palmares_development',
        interpreter: 'node',
        script: path.join(path.dirname(__dirname), 'commands', 'startapp.js'),
        watch: [settings.BASE_PATH, path.dirname(__dirname)],
        // Delay between restart
        watch_delay: 1000,
        ignore_watch : ["node_modules"],
    }]
}