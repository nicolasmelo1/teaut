const logger = require('../logging')
const { spawn } = require('child_process')
const path = require('path')

/**
 * Responsible for handling all of the cli commands, instead of making a lot of files we can just run manage.js
 * and run the commands that we need like migrate, makemigrations and runserver, right now it doesn't support at any arguments
 * but we can support that in the near future using a proper cli library.
 */
const handleCommands = (settingsPath = null) => {
    const cliArguments = process.argv.slice(2)

    if (settingsPath === null) settingsPath = process.env.PALMARES_SETTINGS_MODULE
    const { defineSettings } = require('../conf')

    logger.INFO.USING_SETTINGS(settingsPath)
    const settings = require(settingsPath)
    defineSettings(settings)
    
    const defaultSpawnOptions = { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env : {
            ...process.env,
            PALMARES_SETTINGS_MODULE: settingsPath
        }
    }
    switch (cliArguments[0]) {
        case 'migrate':
            spawn('npm', ['run', 'migrate'], defaultSpawnOptions)
            break
        case 'makemigrations':
            spawn('npm', ['run', 'makemigrations'], defaultSpawnOptions)
            break
        case 'runserver':
            spawn('npm', ['run', 'startapp'], defaultSpawnOptions)
            break
        default:
            console.log('Invalid command')
    }
}

module.exports = handleCommands