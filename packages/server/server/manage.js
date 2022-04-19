const path = require('path')
const { spawn } = require('child_process')
const commands = require('../palmares/commands')

process.on('SIGINT', () => {
    spawn('npm', ['run', 'stop'], { 
        stdio: 'inherit',
        cwd: path.join(__dirname),
        env : process.env
    })
})

commands(path.join(__dirname, 'src', 'settings.js'))