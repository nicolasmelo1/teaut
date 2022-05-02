const { LibraryModule } = require(".")
const { INTEGER_TYPE, FLOAT_TYPE } = require("../types")


class Number_ extends LibraryModule {
    methods = {
        isInteger: async ({ number } = {}) => {
            return await this.newBoolean(number.type === INTEGER_TYPE)
        },
        isFloat: async ({ number } = {}) => {
            return await this.newBoolean(number.type === FLOAT_TYPE)
        },
        round: async({ number, decimalPlaces = 0 } = {}) => {
            const Float = require('./float')
            const floatLibraryModule = new Float(this.settings, 'Float', this.scope)
            await floatLibraryModule._initialize_('Float', this.scope)
            return await floatLibraryModule.methods.round({ number, decimalPlaces })
        },
        toString: async({ number } = {}) => {
            return await number._string_()
        },
    }

    static async documentation() {

    }
}

module.exports = Number_