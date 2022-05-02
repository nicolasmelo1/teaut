const { LibraryModule, LibraryStruct } = require(".")
const { retrieveRepresentation } = require("../../helpers/library")
const errorTypes = require("../errorTypes")
const { FlowDatetime, FlowInteger, FlowNull, FlowString } = require("../objects")

/**
 * Used for retrieving the difference between two dates in Flow. This is returned when using the `diference` method
 * in `Datetime` module.
 */
class DatetimeDifference extends LibraryStruct {
    __moduleName = 'Datetime'

    async _initialize_({ years=0, months=0, days=0, hours=0, minutes=0, seconds=0, microseconds=0 }) {
        this.__attributes = {
            years: years,
            months: months,
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds,
            microseconds: microseconds
        }
        return await super._initialize_()
    }
}

class Datetime extends LibraryModule {
    methods = {
        /**
         * Checks if a given value is a FlowDatetime object.
         * 
         * @param {object} params - The parameters recieved by `isDatetime` function.
         * @param {FlowDatetime} params.value - The value to check if it is a FlowDatetime object.
         * 
         * @returns {import('../objects/boolean')} - Returns `true` if the value is a FlowDatetime object, `false` otherwise.
         */
        isDatetime: async ({element} = {}) => {
            return await this.newBoolean(element instanceof FlowDatetime)
        },
        /**
         * Gets the current date and time in the timezone of the user. You will see that we use UTC here. That's because we convert to the user's timezone
         * when we actually represent the value. If we didn't do this then this would give wrong results. It's not possible at the current time
         * to get the now() value without the timezone.
         * 
         * @returns {FlowDatetime} - Returns a FlowDatetime object representing the current date and time.
         */
        now: async () => {
            const now = new Date()
            return await this.newDatetime({
                year: now.getUTCFullYear(), 
                month: now.getUTCMonth(), 
                day: now.getUTCDate(),
                hour: now.getUTCHours(), 
                minute: now.getUTCMinutes(), 
                second: now.getUTCSeconds(), 
                microsecond: now.getUTCMilliseconds()
            })
        },
        /**
         * Gets the year of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `year` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the year of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the year of the FlowDatetime object.
         */
        year: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getFullYear())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['year'][0]}' is not a datetime.`)
            }
        },
        /**
         * Gets the month of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `month` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the month of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the month of the FlowDatetime object.
         */
        month: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getMonth() + 1)
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['month'][0]}' is not a datetime.`)
            }
        },
        /**
         * Gets the day of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `day` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the day of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the day of the FlowDatetime object.
         */
        day: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getDate())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['month'][0]}' is not a datetime.`)
            }
        },
        /**
         * Gets the hour of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `hour` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the hour of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the hour of the FlowDatetime object.
         */
        hour: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getHours())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['hour'][0]}' is not a datetime.`)
            }
        },
        /**
         * Gets the minute of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `minute` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the minute of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the minute of the FlowDatetime object.
         */
        minute: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getMinutes())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['minute'][0]}' is not a datetime.`)
            }
        },
        /**
         * Gets the second of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `second` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the second of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the second of the FlowDatetime object.
         */
        second: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getSeconds())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['second'][0]}' is not a datetime.`)
            }
        },
        /**
         * Gets the microsecond of a FlowDatetime object as a FlowInteger object.
         * 
         * @param {object} params - The parameters recieved by `microsecond` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to get the microsecond of.
         * 
         * @returns {FlowInteger} - Returns a FlowInteger object representing the microsecond of the FlowDatetime object.
         */
        microsecond: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                datetime = await retrieveRepresentation(datetime)
                return await this.newInteger(datetime.getMilliseconds())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['microsecond'][0]}' is not a datetime.`)
            }
        },
        /**
         * Retrieves a new FlowDatetime object programatically. Although the user can create dates with ```Datetime.now()```
         * and ```~D[2020-10-11]```, sometimes the user just wants to create a date programatically. For example:
         * ```
         * number_of_covid_years = 2
         * year = 2019 
         * month = 10
         * day = 11
         * 
         * date = Datetime.new(year + number_of_covid_years, month, day)
         * 
         * # or
         * 
         * number_of_months_to_create_invoices = 3
         * today = Datetime.now()
         * List.map(List.create_range(1, number_of_months_to_create_invoices+1), function(x): Datetime.new(Datetime.year(today), Datetime.month(today) + x, Datetime.day(today)))
         * ```
         * 
         * @param {object} params - The parameters recieved by `new` function.
         * @param {FlowInteger} params.year - The year of the FlowDatetime object. It is obligatory for defining a new date.
         * @param {FlowInteger} params.month - The month of the FlowDatetime object, can range from 1 to 12. 
         * @param {FlowInteger} params.day - The day of the FlowDatetime object, can range from 1 to 31.
         * @param {FlowInteger} params.hour - The hour of the FlowDatetime object, can range from 0 to 23.
         * @param {FlowInteger} params.minute - The minute of the FlowDatetime object, can range from 0 to 59.
         * @param {FlowInteger} params.second - The second of the FlowDatetime object, can range from 0 to 59.
         * @param {FlowInteger} params.microsecond - The microsecond of the FlowDatetime object, can range from 0 to 999.
         * 
         * @returns {Promise<FlowDatetime>} - Returns a new FlowDatetime object with the given year, month, days, and etc.
         */
        new: async ({ year, month=1, day=1, hour=0, minute=0, second=0, microsecond=0 } = {}) => {
            const isYearAInteger = year instanceof FlowInteger
            const isMonthAInteger = month instanceof FlowInteger
            const isDayAInteger = day instanceof FlowInteger
            const isHourAInteger = hour instanceof FlowInteger
            const isMinuteAInteger = minute instanceof FlowInteger
            const isSecondAInteger = second instanceof FlowInteger
            const isMicrosecondAInteger = microsecond instanceof FlowInteger
            const isValidParameters = isYearAInteger && isMonthAInteger && isDayAInteger && isHourAInteger && isMinuteAInteger && isSecondAInteger && isMicrosecondAInteger
            
            if (isValidParameters) {
                year = await retrieveRepresentation(year)
                month = await retrieveRepresentation(month)
                day = await retrieveRepresentation(day)
                hour = await retrieveRepresentation(hour)
                minute = await retrieveRepresentation(minute)
                second = await retrieveRepresentation(second)
                microsecond = await retrieveRepresentation(microsecond)
                return await this.newDatetime({
                    year, month: month-1, day, hour, minute, second, microsecond
                })
            } else {
                if (!isYearAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][0]}' is not an integer.`)
                if (!isMonthAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][1]}' is not an integer.`)
                if (!isDayAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][2]}' is not an integer.`)
                if (!isHourAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][3]}' is not an integer.`)
                if (!isMinuteAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][4]}' is not an integer.`)
                if (!isSecondAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][5]}' is not an integer.`)
                if (!isMicrosecondAInteger) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['new'][6]}' is not an integer.`)
            }
        },
        /**
         * Converts a date to a ISO 8601 string so it can be used in apis or other common use cases.
         * 
         * @param {object} params - The parameters recieved by `toIsoString` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to convert to a ISO 8601 string.
         * 
         * @returns {Promise<import('../objects/string')>} - Returns a FlowString object representing the ISO 8601 string of the FlowDatetime object.
         */
        toIsoString: async ({ datetime } = {}) => {
            if (datetime instanceof FlowDatetime) {
                return await this.newString(await datetime._json_())
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['toIsoString'][0]}' is not a datetime.`)
            }
        },
        /**
         * Retrieves the date from a ISO8601 string, this is useful for when the user is working with APIs, since this is supposed to be a Low-Code language this will
         * come in handy for times when we need to interact with APIs like Google Calendar, Google Sheets, or others that use ISO 8601 strings.
         * 
         * @param {object} params - The parameters recieved by `fromIsoString` function.
         * @param {FlowString} params.isoString - The ISO 8601 string to convert to a FlowDatetime object.
         * 
         * @returns {Promise<FlowDatetime>} - Returns a FlowDatetime object representing the date from the ISO 8601 string.
         */
        fromIsoString: async ({ isoString } = {}) => {
            if (isoString instanceof FlowString) {
                isoString = await retrieveRepresentation(isoString)
                const date = new Date(isoString)
                if (isNaN(date.getTime())) {
                    await this.newError(errorTypes.VALUE, `'${this.parametersContextForFunctions['fromIsoString'][0]}' is not a valid ISO 8601 string.`)
                } else {
                    return await this.newDatetime({ 
                        year: date.getUTCFullYear(), 
                        month: date.getUTCMonth(), 
                        day: date.getUTCDate(), 
                        hour: date.getUTCHours(), 
                        minute: date.getUTCMinutes(), 
                        second: date.getUTCSeconds(), 
                        microsecond: date.getUTCMilliseconds() 
                    })
                }
            } else {
                await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['fromIsoString'][0]}' is not a string. Should be a string.`)
            }
        },
        /**
         * This will add a number of days, months, years, hours, minutes, seconds, or microseconds to a FlowDatetime object.
         * 
         * Yes, the user can add microseconds to dates and this gives some flexibility to Flow`s behaviour for developers, but since
         * this is supposed to be a Low-code language, we give this option that offers a more direct approach on how users can sum, or subtract
         * values from dates.
         * 
         * @param {object} params - The parameters recieved by `add` function.
         * @param {FlowDatetime} params.datetime - The FlowDatetime object to add the values to.
         * @param {FlowInteger | FlowNull | null} params.years - The number of years to add to the FlowDatetime object. If ommited we will not add any years.
         * @param {FlowInteger | FlowNull | null} params.months - The number of months to add to the FlowDatetime object. If ommited we will not add any months.
         * @param {FlowInteger | FlowNull | null} params.days - The number of days to add to the FlowDatetime object. If ommited we will not add any days.
         * @param {FlowInteger | FlowNull | null} params.hours - The number of hours to add to the FlowDatetime object. If ommited we will not add any hours.
         * @param {FlowInteger | FlowNull | null} params.minutes - The number of minutes to add to the FlowDatetime object. If ommited we will not add any minutes.
         * @param {FlowInteger | FlowNull | null} params.seconds - The number of seconds to add to the FlowDatetime object. If ommited we will not add any seconds.
         * @param {FlowInteger | FlowNull | null} params.microseconds - The number of microseconds to add to the FlowDatetime object. If ommited we will not add any microseconds.
         * 
         * @returns {Promise<FlowDatetime>} - Returns a new FlowDatetime object with the years, months, days, hours, minutes, seconds OR microseconds added.
         */
        add: async ({ datetime, years=null, months=null, days=null, hours=null, minutes=null, seconds=null, microseconds=null } = {}) => {
            const isDatetimeADatetime = datetime instanceof FlowDatetime
            const isYearAIntegerOrNull = years instanceof FlowInteger || years instanceof FlowNull || years === null
            const isMonthAIntegerOrNull = months instanceof FlowInteger || months instanceof FlowNull || months === null
            const isDayAIntegerOrNull = days instanceof FlowInteger || days instanceof FlowNull || days === null
            const isHourAIntegerOrNull = hours instanceof FlowInteger || hours instanceof FlowNull  || hours === null
            const isMinuteAIntegerOrNull = minutes instanceof FlowInteger || minutes instanceof FlowNull || minutes === null
            const isSecondAIntegerOrNull = seconds instanceof FlowInteger || seconds instanceof FlowNull || seconds === null
            const isMicrosecondAIntegerOrNull = microseconds instanceof FlowInteger || microseconds instanceof FlowNull || microseconds === null
            const isValidParameters = isDatetimeADatetime && isYearAIntegerOrNull && isMonthAIntegerOrNull && isDayAIntegerOrNull && 
                isHourAIntegerOrNull && isMinuteAIntegerOrNull && isSecondAIntegerOrNull && isMicrosecondAIntegerOrNull
            if (isValidParameters) {
                const newDate = await this.newDatetime()
                newDate.year = datetime.year
                newDate.month = datetime.month
                newDate.day = datetime.day
                newDate.hour = datetime.hour
                newDate.minute = datetime.minute
                newDate.second = datetime.second
                newDate.microsecond = datetime.microsecond
                
                years = await retrieveRepresentation(years)
                months = await retrieveRepresentation(months)
                days = await retrieveRepresentation(days)
                hours = await retrieveRepresentation(hours)
                minutes = await retrieveRepresentation(minutes)
                seconds = await retrieveRepresentation(seconds)
                microseconds = await retrieveRepresentation(microseconds)

                if (years !== null) newDate.year += years
                if (months !== null) newDate.month += months
                if (days !== null) newDate.day += days
                if (hours !== null) newDate.hour += hours
                if (minutes !== null) newDate.minute += minutes
                if (seconds !== null) newDate.second += seconds
                if (microseconds !== null) newDate.microsecond += microsecond
                return newDate
            } else {
                if (!isDatetimeADatetime) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][0]}' should be a datetime.`)
                if (!isYearAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][1]}' is not an integer.`)
                if (!isMonthAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][2]}' is not an integer.`)
                if (!isDayAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][3]}' is not an integer.`)
                if (!isHourAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][4]}' is not an integer.`)
                if (!isMinuteAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][5]}' is not an integer.`)
                if (!isSecondAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][6]}' is not an integer.`)
                if (!isMicrosecondAIntegerOrNull) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['add'][7]}' is not an integer.`)
            }
        },
        /**
         * Returns the difference between two dates. This will create a struct with the following fields: `years`, `months`, `days`, `hours`, `minutes`, `seconds`, `microseconds`.
         * and you can use that to retrieve exactly the difference between the two dates in the dimension i`re interested in.
         * For example:
         * ```
         * difference = Datetime.difference(~D[2022-12-30 20], ~D[2022-12-30 10])
         * difference == DatetimeDifference{ years=0, months=0, days=0, hours=10, minutes=600, seconds=36000, microseconds=36000000 }
         * 
         * difference.minutes == 600
         * difference.hours == 10
         * ```
         * This will make it easy to work with the difference in the dimension you are interested in.
         * 
         * @param {FlowDatetime} params.biggerDate - The biggest date to compare.
         * @param {FlowDatetime} params.smallerDate - The smallest date to compare.
         * 
         * @returns {Promise<FlowDatetimeDifference>} - Returns a new FlowDatetimeDifference struct with the difference in 
         * years, months, days, hours, minutes, seconds and microseconds.
         */
        difference: async ({ biggerDate, smallerDate } = {}) => {
            const isBiggerDateADatetime = biggerDate instanceof FlowDatetime
            const isSmallerDateADatetime = smallerDate instanceof FlowDatetime
            if (isBiggerDateADatetime && isSmallerDateADatetime) {
                biggerDate = await retrieveRepresentation(biggerDate)
                smallerDate = await retrieveRepresentation(smallerDate)
                
                const diffInYears = new Date(biggerDate - smallerDate).getUTCFullYear() - 1970
                let diffInMonths = (biggerDate.getFullYear() - smallerDate.getFullYear()) * 12
                diffInMonths -= smallerDate.getMonth()
                diffInMonths += biggerDate.getMonth()
                const utc1 = Date.UTC(biggerDate.getFullYear(), biggerDate.getMonth(), biggerDate.getDate(), biggerDate.getHours(), biggerDate.getMinutes(), biggerDate.getSeconds())
                const utc2 = Date.UTC(smallerDate.getFullYear(), smallerDate.getMonth(), smallerDate.getDate(), smallerDate.getHours(), smallerDate.getMinutes(), smallerDate.getSeconds())
                const diffInDays = Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24))
                const diffInHours = Math.floor((utc1 - utc2) / (1000 * 60 * 60))
                const diffInMinutes = Math.floor((utc1 - utc2) / (1000 * 60))
                const diffInSeconds = Math.floor((utc1 - utc2) / 1000)
                const diffInMicroseconds = biggerDate - smallerDate

                return await DatetimeDifference.new(this.settings, 'DatetimeDifference', { 
                    years: diffInYears, 
                    months: diffInMonths, 
                    days: diffInDays, 
                    hours: diffInHours, 
                    minutes: diffInMinutes, 
                    seconds: diffInSeconds, 
                    microseconds: diffInMicroseconds 
                })
            } else {
                if (!isBiggerDateADatetime) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['difference'][0]}' should be a datetime.`)
                if (!isSmallerDateADatetime) await this.newError(errorTypes.TYPE, `'${this.parametersContextForFunctions['difference'][1]}' should be a datetime.`)
            }
        }
    }

    static async documentation() {

    }
}

module.exports = Datetime