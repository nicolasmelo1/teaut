/**
 * Use this script to install all of the project node_module packages. This way we can keep each project's node_modules
 * self contained, instead of using the global node_modules. This will REALLY quickly install all of the dependencies in
 * your machine so you can get up and running really fast in the development environment.
 */
const { spawn } = require('child_process')
const { resolve, dirname } = require('path')
const { readdir } = require('fs').promises

/**
 * Reference: https://stackoverflow.com/a/45130990
 * Disclaimer: i don't want to blow your head off, the directory structure here can grow to
 * be REALLY huge. So it's the solution better suited for this project.
 */
async function* recursivelyGetFiles(dir, toIgnore=[], toReturn=[]) {
    const dirents = await readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
        const resolution = resolve(dir, dirent.name)
        if (dirent.isDirectory() && !toIgnore.includes(dirent.name)) {
            yield* recursivelyGetFiles(resolution, toIgnore, toReturn)
        } else if (toReturn.includes(dirent.name)) {
            yield resolution
        }
    }
}

(async () => {
    for await (const directoryToNpmInstall of recursivelyGetFiles(dirname(__dirname), ['node_modules', 'build', 'dist', 'public', 'test', '.turbo', '.next', '.expo'], ['package.json'])) {
        spawn('npm', ['install'], {
            stdio: 'inherit',
            cwd: dirname(directoryToNpmInstall),
            env : process.env
        })
    }
})()
