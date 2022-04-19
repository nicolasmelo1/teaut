
/**
 * This will initialize the project settings, it will hold all of the settings configurations and as you can see below
 * it's the first thing we do when we load this file.
 * 
 * It holds the state for the settings inside of the app so others can retrieve the settings from the app.
 * 
 * @returns {{
 *      get: () => object,
 *      set: (settings: object) => void
 * }} - Returns two functions: get for retrieving the settings of the application and `set` for defining the settings of the application.
 */
function initializeProjectSettings() {
    let defaultSettings = {}
    if (process.env.PALMARES_SETTINGS_MODULE !== undefined) {
        try {
            defaultSettings = require(process.env.PALMARES_SETTINGS_MODULE)
        } catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e
            }
        }
    }
    let settings = {
        current: defaultSettings
    }

    return {
        get: () => {
            return settings.current
        },
        set: (newSettings) => {
            settings.current = newSettings
        } 
    }
}

projectSettings = initializeProjectSettings()

module.exports = {
    settings: projectSettings.get(),
    defineSettings: projectSettings.set
}
