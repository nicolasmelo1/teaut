/** @module src/formula/utils/builtin/objects/datetime */

const { DatetimeHelper } = require('../../helpers')
const FlowObject = require('./object')
const { DATETIME_TYPE, FLOAT_TYPE, INTEGER_TYPE, BOOLEAN_TYPE } = require('../types')
const FlowError = require('./error')
const errorTypes = require('../errorTypes')

/**
 * Represents a datetime in flow. Datetime in Flow are first class citzens. More similar to Excel than other languages.
 * 
 * The idea is that the user can freely define datetime values without worrying about importing a specific method, class
 * or whatever. All datetime in flow is timezone aware, this means we store the timezone value from the dates, so we can safely
 * know what timezone we are comparing to.
 */
class FlowDatetime extends FlowObject {
    constructor(settings) {
        super(settings, DATETIME_TYPE)
    }

    /**
     * Retrieves a new FlowDatetime by a given string, the given string will be the value that lives inside the token
     * generated by the lexer. So by doing this we can convert dates like '2020-10-12 12' to a FlowDatetime object with the
     * exact value and formatting defined by flow.
     * The example above will match only dates with the 'YYYY-MM-DD HH:mm:ss' format. But we can change the format if we 
     * want to to in the Context if we want to.
     * 
     * @param {import('../../settings').Settings} settings - The settings object to be used when converting the string to
     * a FlowDatetime object.
     * @param {string} value - The string to be converted to a FlowDatetime object.
     * 
     * @returns {Promise<FlowDatetime>} - A FlowDatetime object that holds the date.
     */
    static async newFromString(settings, datetimeString) {
        const datetimeHelper = new DatetimeHelper()
        const getFormated = async (value, valueRegex, originalFormat, formatRegex) => {
            valueRegex = new RegExp(valueRegex, 'g')
            formatRegex = new RegExp(formatRegex, 'g')
            const matchedValues = [...value.matchAll(valueRegex)][0]
            const matchedFormat = [...originalFormat.matchAll(formatRegex)][0]
            if (matchedValues !== undefined && matchedValues.length > 0) {
                let index = 0
                for (const matchedCharacter of matchedFormat) {
                    await datetimeHelper.appendValues(matchedCharacter, matchedValues[index])
                    index++
                }
            } else {
                await FlowError.new(settings, errorTypes.SYNTAX, `Invalid part of datetime: '${value}'`)
            }
        }
        // reference: https://stackoverflow.com/a/4607799
        const splitedDatetimeByDateAndTime = datetimeString.split(/ (.+)/).filter(character=>character !== '')
        if (splitedDatetimeByDateAndTime.length > 0) {
            const regexOfDate = await settings.dateFormatToRegex()
            const regexOfDateFormat = await settings.dateFormatToRegex(true)

            if ((new RegExp(regexOfDate)).test(splitedDatetimeByDateAndTime[0])) {
                await getFormated(
                    splitedDatetimeByDateAndTime[0],
                    regexOfDate,
                    settings.datetimeDateFormat,
                    regexOfDateFormat
                )
                if (splitedDatetimeByDateAndTime.length > 1) {
                    const regexOfTime = await settings.timeFormatToRegex()
                    const regexOfTimeFormat = await settings.timeFormatToRegex(true)
                    await getFormated(
                        splitedDatetimeByDateAndTime[1],
                        regexOfTime,
                        settings.datetimeTimeFormat,
                        regexOfTimeFormat
                    )
                }
            } else {
                await FlowError.new(settings, errorTypes.SYNTAX, `Invalid datetime: '${datetimeString}', accepted format: '${settings.datetimeDateFormat} ${settings.datetimeTimeFormat}'`)
            }
        } else {
            await FlowError.new(settings, errorTypes.SYNTAX, `Invalid datetime: '${datetimeString}', accepted format: '${settings.datetimeDateFormat} ${settings.datetimeTimeFormat}'`)
        }
        return this.new(settings, {
            year: await datetimeHelper.getValue('year'),
            month: await datetimeHelper.getValue('month') - 1,
            day: await datetimeHelper.getValue('day'),
            hour: await datetimeHelper.getValue('hour'),
            minute: await datetimeHelper.getValue('minute'),
            second: await datetimeHelper.getValue('second'),
            microsecond: await datetimeHelper.getValue('microsecond'),
            timezone: 'UTC'
        })
    }
    /**
     * Factory method for returning a new Datetime object.
     * 
     * @param {object} dateData - The data to be converted to a Datetime object.
     * @param {number} [dateData.year=2000] - The year of the date.
     * @param {number} [dateData.month=1] - The month of the date.
     * @param {number} [dateData.day=1] - The day of the date.
     * @param {number} [dateData.hour=0] - The hour of the date.
     * @param {number} [dateData.minute=0] - The minute of the date.
     * @param {number} [dateData.second=0] - The second of the date.
     * @param {number} [dateData.microsecond=0] - The microsecond of the date.
     * @param {string|undefined} [dateData.timezone=undefined] - The timezone of the date, all dates in flow are timezone aware.
     * 
     * @returns {Promise<FlowDatetime>} - A FlowDatetime object.
     */
    static async new(settings, {year=2000, month=1, day=1, hour=0, minute=0, second=0, microsecond=0, timezone=undefined} = {}) {
        return await (new FlowDatetime(settings))._initialize_({year, month, day, hour, minute, second, microsecond, timezone})
    }

    
    /**
     * Initialize the actual date by giving the year, month, day, hour, minute, second AND milisecond of the date with the timezone
     * to use for the date.
     * 
     * @param {object} dateData - The data to be converted to a Datetime object.
     * @param {number} [dateData.year=2000] - The year of the date.
     * @param {number} [dateData.month=1] - The month of the date.
     * @param {number} [dateData.day=1] - The day of the date.
     * @param {number} [dateData.hour=0] - The hour of the date.
     * @param {number} [dateData.minute=0] - The minute of the date.
     * @param {number} [dateData.second=0] - The second of the date.
     * @param {number} [dateData.microsecond=0] - The microsecond of the date.
     * @param {string|null} [dateData.timezone=undefined] - The timezone of the date, all dates in flow are timezone aware.
     * 
     * @returns {Promise<FlowDatetime>} - A FlowDatetime object.
     */
    async _initialize_({year=2000, month=1, day=1, hour=0, minute=0, second=0, microsecond=0, timezone=undefined} = {}) {
        this.timezone = timezone !== undefined ? timezone : this.settings.timezone

        this.year = parseInt(year)
        this.month = parseInt(month)
        this.day = parseInt(day)
        this.hour = parseInt(hour)
        this.minute = parseInt(minute)
        this.second = parseInt(second)
        this.microsecond = parseInt(microsecond)

        return await super._initialize_()
    }

    /**
     * You can add a number to the new date. This will be the number of milliseconds to add to the
     * current date.
     * 
     * @param {import('./float') | import('./integer') | import('./boolean')} obj - The date to add to this date.
     * 
     * @returns {Promise<FlowDatetime>} - The new date.
     */
    async _add_(obj) {
        if ([FLOAT_TYPE, INTEGER_TYPE, BOOLEAN_TYPE].includes(obj.type)) {
            const passedMilliseconds = await obj._representation_()
            return await this.newDatetime({
                year: this.year,
                month: this.month,
                day: this.day,
                hour: this.hour,
                minute: this.minute,
                second: this.second,
                microsecond: this.microsecond + passedMilliseconds,
                timezone: this.timezone
            })
        } else {
            return await super._add_(obj)
        }
    }

    /**
     * When we subtract two dates, by default we return a new Integer. Similar to how javascript works with dates we 
     * do this to. The integer returned represents the number of milliseconds between the two dates. You can also subtract 
     * a number to the new date. This will be the number of milliseconds to subtract from the current date.
     * 
     * @param {FlowDatetime | import('./float') | import('./integer')} obj - The date to subtract to this date.
     * 
     * @returns {Promise<FlowDatetime>} - The new date.
     */
    async _subtract_(obj) {
        if (obj.type === DATETIME_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newInteger(representation - objectRepresentation)
        } else if ([FLOAT_TYPE, INTEGER_TYPE, BOOLEAN_TYPE].includes(obj.type)) {
            const passedMilliseconds = await obj._representation_()
            return await this.newDatetime({
                year: this.year,
                month: this.month,
                day: this.day,
                hour: this.hour,
                minute: this.minute,
                second: this.second,
                microsecond: this.microsecond - passedMilliseconds,
                timezone: this.timezone
            })
        } else {
            return await super._add_(obj)
        }
    }
    
    /**
     * We check if two dates are equal by using the representation of the date. This is because we have timezones
     * to consider which might make the dates differ even if they look the same.
     * 
     * @param {FlowDatetime} obj - The date to compare to this date.
     * 
     * @returns {Promise<import('./boolean')>} - True if the dates are equal, false otherwise.
     */
    async _equals_(obj) {
        if (obj.type === DATETIME_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newBoolean(representation.toISOString() === objectRepresentation.toISOString())
        } else {
            return await super._equals_(obj)
        }
    }

    /**
     * Checks if the date in milliseconds is less than another given date.
     * 
     * @param {FlowDatetime} obj - The date to compare to this date.
     * 
     * @returns {Promise<import('./boolean')>} - True if the date is less than the given date, false otherwise.
     */
    async _lessthan_(obj) {
        if (obj.type === DATETIME_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newBoolean(representation < objectRepresentation)
        } else {
            return await super._lessthan_(obj)
        }
    }

    /**
     * Checks if the date in milliseconds is greater than another given date.
     * 
     * @param {FlowDatetime} obj - The date to compare to this date.
     * 
     * @returns {Promise<import('./boolean')>} - True if the date is greater than the given date, false otherwise.
     */
    async _greaterthan_(obj) {
        if (obj.type === DATETIME_TYPE) {
            const representation = await this._representation_()
            const objectRepresentation = await obj._representation_()
            return await this.newBoolean(representation > objectRepresentation)
        } else {
            return await super._lessthan_(obj)
        }
    }

    /**
     * A date object by default always return a new FlowBoolean as true instead of the default false.
     * 
     * @returns {Promise<import('./boolean')>} - True.
     */
    async _boolean_() {
        return await this.newBoolean(true)
    }

    /**
     * This will create a new javascript date timezone aware.
     * 
     * Reference: https://stackoverflow.com/a/54127122
     * 
     * @returns {Promise<Date>} - A Date Object that we will effectively use to calculate dates
     * inside of flow.
     */
    async _representation_() { 
        return new Date((new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.microsecond))
            .toLocaleString("sv-SE", { timeZone: this.timezone }).replace(' ', 'T') + `.${this.microsecond.toString().slice(-3)}Z`)
    }

    /**
     * Returns the date as an iso string.
     * 
     * @returns {Promise<String>} - The date as an iso string.
     */
    async _json_() {
        const representation = await this._representation_()
        const datetimeHelper = new DatetimeHelper()

        await datetimeHelper.appendValuesByDefinition('year', representation.getFullYear())
        await datetimeHelper.appendValuesByDefinition('month', representation.getMonth() + 1)
        await datetimeHelper.appendValuesByDefinition('day', representation.getDate())
        await datetimeHelper.appendValuesByDefinition('hour', representation.getHours())
        await datetimeHelper.appendValuesByDefinition('minute', representation.getMinutes())
        await datetimeHelper.appendValuesByDefinition('second', representation.getSeconds())
        await datetimeHelper.appendValuesByDefinition('microsecond', representation.getMilliseconds())

        return `${await datetimeHelper.getValueStringfiedByFormat('YYYY')}-`+
               `${await datetimeHelper.getValueStringfiedByFormat('MM')}-`+
               `${await datetimeHelper.getValueStringfiedByFormat('DD')}T`+
               `${await datetimeHelper.getValueStringfiedByFormat('hh')}:`+
               `${await datetimeHelper.getValueStringfiedByFormat('mm')}:`+
               `${await datetimeHelper.getValueStringfiedByFormat('ss')}.`+
               `${await datetimeHelper.getValueStringfiedByFormat('SSS')}Z`
    }
    
    /**
     * Gets the exact representation of the string for the user as a string so he can debug it and understand
     * what is happening with his code.
     * 
     * @returns {Promise<import('./string')>} - The exact representation this object as a flow string for the user.
     */
    async _string_() {
        const representation = await this._representation_()
        const datetimeHelper = new DatetimeHelper()

        await datetimeHelper.appendValuesByDefinition('year', representation.getFullYear())
        await datetimeHelper.appendValuesByDefinition('month', representation.getMonth() + 1)
        await datetimeHelper.appendValuesByDefinition('day', representation.getDate())
        await datetimeHelper.appendValuesByDefinition('hour', representation.getHours())
        await datetimeHelper.appendValuesByDefinition('minute', representation.getMinutes())
        await datetimeHelper.appendValuesByDefinition('second', representation.getSeconds())
        await datetimeHelper.appendValuesByDefinition('microsecond', representation.getMilliseconds())

        let datePartOfRepresentation = this.settings.datetimeDateFormat
        let timePartOfRepresentation = this.settings.datetimeTimeFormat
        const regexOfDateFormat = await this.settings.dateFormatToRegex(true)
        const matchedDateFormat = [...this.settings.datetimeDateFormat.matchAll(new RegExp(regexOfDateFormat, 'g'))][0]
        for (const formatString of matchedDateFormat) {
            const value = await datetimeHelper.getValueStringfiedByFormat(formatString)
            if (value !== null) {                
                datePartOfRepresentation = datePartOfRepresentation.replace(formatString, value)
            }
        }

        const regexOfTimeFormat = await this.settings.timeFormatToRegex(true)
        const matchedTimeFormat = [...this.settings.datetimeTimeFormat.matchAll(new RegExp(regexOfTimeFormat, 'g'))][0]
        for (const formatString of matchedTimeFormat) {
            const value = await datetimeHelper.getValueStringfiedByFormat(formatString)
            if (value !== null) {                
                timePartOfRepresentation = timePartOfRepresentation.replace(formatString, value)
            }
        }

        return await this.newString(
            `${this.settings.sigilString}${this.settings.datetimeDateCharacter}`+
            `[${datePartOfRepresentation} ${timePartOfRepresentation}]`
        )
    }
}

module.exports = FlowDatetime