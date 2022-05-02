/** @module src/formula/utils/helpers/datetime */

/**
 * Helper class used for working with dates inside of Flow. This make it easy to work with dates.
 */
 class DatetimeHelper {
    validFormats = [
        'YYYY',
        'MM',
        'DD',
        'hh',
        'HH',
        'mm',
        'ss',
        'SSS',
        'AA'
    ]

    validAttributes = [
        'year',
        'month',
        'day',
        'hour',
        'minute',
        'second',
        'microsecond'
    ]

    /**
     * Validates if a given format exists in the `validFormats` array inside of this helper class.
     * This is because we prevent stuff like `YY-mm-dd` from being validated inside of here.
     * 
     * @throws {Error} - if the given format does not exist, throws an error.
     */
    async validateFormat(datetimeFormat) {
        if (!this.validFormats.includes(datetimeFormat)) {
            throw new Error(`'${datetimeFormat}' is not a valid datetime format`)
        }
    }

    /**
     * Gets the regex for a given format. For example, in the 'YYYY' part of the 'YYYY-MM-DD' date format we expect the 
     * year to be a 4 numbers string. The MM part is expected to be either 01, 02, ... 09 or 10, 11, 12 or 1, 2, 3 ... 9.
     * 
     * @param {'YYYY' | 'MM' | 'DD' | 'hh' | 'HH' | 'mm' | 'ss' | 'SSS' | 'AA'} datetimeFormat - The format to get the 
     * regex for. Needs to exist in the `validFormats` array.
     * 
     * @returns {Promise<string>} - The regex to use
     */
    async getRegex(datetimeFormat) {
        await this.validateFormat(datetimeFormat)

        switch(datetimeFormat) {
            case 'YYYY':
                return '(\\d{4})'
            case 'MM':
                return '(0[1-9]|1[0-2]|[1-9])'
            case 'DD':
                return '(0[1-9]|1[0-9]|2[0-9]|3[0-1]|[1-9])'
            case 'hh':
                return '(0[0-9]|1[0-9]|2[0-3]|[1-9])'
            case 'HH':
                return '(0[1-9]|1[0-2]|[1-9])'
            case 'mm':
                return '(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])?'
            case 'ss':
                return '(0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])?'
            case 'SSS':
                return '(\\d{3})?'
            case 'AA':
                return '(am|pm|AM|PM)?'
            default:
                return '(\\d{3})?'
        }
    }

    /**
     * This might doesn't make any sense at all, but this is how we retrieve the values using this function.
     * 
     * we DO NOT append and retrieve the values directly you will see is that we create some attributes in the object
     * 'dateYear', 'dateMonth' and so on. All of those attributes are objects that holds the data needed for retrieving the
     * value you appended.
     * 
     * But why do we do this you might ask. So suppose the format have the AM/PM part in the date. This comes last in the hour it will be
     * something like 11:20:52 PM, this means this time is 23:20:52 in the 24hour date format. So what we need? We store the value of the hour
     * which is 11, with this value we also store the `amOrPm` in the object that we will use for adding by 12. So, like i said before, 
     * 11 PM is actually 23 in the 24 hour time format. So it is 11 + 12. That's why we need to store the values BEFORE retrieving the actual value. 
     * This way when we retrieve the value we can format a to something javascript actually can understand and interpret.
     * 
     * @param {'YYYY' | 'MM' | 'DD' | 'hh' | 'HH' | 'mm' | 'ss' | 'SSS' | 'AA'} datetimeFormat - The format to get the 
     * regex for. Needs to exist in the `validFormats` array.     
     * @param {string} value - The actual value that exists in the date for this format.
     */
    async appendValues(datetimeFormat, value) {
        if (value !== undefined) {
            switch (datetimeFormat) {
                case 'YYYY':
                    this.dateYear = {
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'MM':
                    this.dateMonth = {
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'DD':
                    this.dateDay = {
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'hh':
                    if (this.dateHour === undefined) this.dateHour = {}
                    this.dateHour = {
                        ...this.dateHour,
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'HH':
                    if (this.dateHour === undefined) this.dateHour = {}
                    this.dateHour = {
                        ...this.dateHour,
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'mm':
                    this.dateMinute = {
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'ss':
                    this.dateSecond = {
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
                case 'AA':
                    if (this.dateHour === undefined) this.dateHour = {}
                    this.dateHour = {
                        ...this.dateHour,
                        amOrPm: value.toLowerCase() === 'pm' ? 'pm' : 'am',
                    }
                    break
                case 'SSS':
                    this.dateMicrosecond = {
                        value: value !== '' ? parseInt(value) : 0
                    }
                    break
            }
        }
    }

    /**
     * Different from `appendValues` method, this method will append the values by the datetime definition.
     * This means that here we have less `switch` case statements. Also the format of the object is somewhat different
     * from one another. But keep in mind that we append the values to the same instance variables.
     * 
     * @param {'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'microsecond'} datetimeDefinition -
     * One of the strings defined in `validAttributes` array in the instantiation of this class.
     * @param {number | string} value - The value to append to datetimehelper instance.
     */
    async appendValuesByDefinition(datetimeDefinition, value) {
        switch (datetimeDefinition) {
            case 'year':
                this.dateYear = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
            case 'month':
                this.dateMonth = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
            case 'day':
                this.dateDay = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
            case 'hour':
                this.dateHour = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
            case 'minute':
                this.dateMinute = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
            case 'second':
                this.dateSecond = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
            case 'microsecond':
                this.dateMicrosecond = {
                    value: value !== '' ? parseInt(value) : 0
                }
                break
        }
    }

    /**
     * This gets each value as string by the actual format. Generally this will be used in conjunction with 
     * the `.appendValuesByDefinition()` method. Different from the `.getValue` this returns the value stringfied and
     * not the actual number. This will also use the format and not the datetimeDefinition like the other method.
     * 
     * @param {'YYYY' | 'MM' | 'DD' | 'hh' | 'HH' | 'mm' | 'ss' | 'SSS' | 'AA'} format - The format to get the value for.
     * Needs to exist in the `validFormats` array.
     * 
     * @returns {Promise<string | null>} - The value of the format as a string. 
     * Gives null if we can't find the value for the given format.
     */
    async getValueStringfiedByFormat(format) {
        switch (format) {
            case 'YYYY':
                return this.dateYear.value
            case 'MM':
                return this.dateMonth.value < 10 ? `0${this.dateMonth.value}` : this.dateMonth.value
            case 'DD':
                return this.dateDay.value < 10 ? `0${this.dateDay.value}` : this.dateDay.value
            case 'hh':
                return this.dateHour.value < 10 ? `0${this.dateHour.value}` : this.dateHour.value
            case 'HH':
                let hourValue = this.dateHour.value >= 12 ? this.dateHour.value - 12 : this.dateHour.value
                hourValue = hourValue === 0 ? 12 : hourValue
                return hourValue < 10 ? `0${hourValue}` : hourValue
            case 'mm':
                return this.dateMinute.value < 10 ? `0${this.dateMinute.value}` : this.dateMinute.value
            case 'ss':
                return this.dateSecond.value < 10 ? `0${this.dateSecond.value}` : this.dateSecond.value
            case 'SSS':
                return this.dateMicrosecond.value < 10 ? `00${this.dateMicrosecond.value}` : 
                       this.dateMicrosecond.value < 100 ? `0${this.dateMicrosecond.value}` : this.dateMicrosecond.value
            case 'AA':
                return this.dateHour.value >= 12 ? 'PM' : 'AM'
            default:
                return null
        }
    }

    /**
     * Returns the actual value from the values appended in the `appendValues()` method.
     * 
     * Here we actually transform the date value to something that javascript can understand. 
     * Sometimes you can convert something while appending and sometimes you need to convert 
     * while retrieving the value. So it needs some thinking before you come up with a solution.
     * 
     * @param {'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'microsecond'} datetimeDefinition -
     * One of the strings defined in `validAttributes` array in the instantiation of this class.
     * 
     * @returns {Promise<number>} - Returns the actual number of the part of the date.
     */
    async getValue(datetimeDefinition) {
        if (datetimeDefinition === 'year' && this.dateYear !== undefined) {
            return this.dateYear.value
        } else if (datetimeDefinition === 'month' && this.dateMonth !== undefined) {
            return this.dateMonth.value
        } else if (datetimeDefinition === 'day' && this.dateDay !== undefined) {
            return this.dateDay.value
        } else if (datetimeDefinition === 'hour' && this.dateHour !== undefined) {
            if (![null, undefined].includes(this.dateHour?.amOrPm)) {
                return this.dateHour.amOrPm === 'pm' ?  this.dateHour.value + 12 : this.dateHour.value
            } else {
                return this.dateHour.value 
            }
        } else if (datetimeDefinition === 'minute' && this.dateMinute !== undefined) {
            return this.dateMinute.value
        } else if (datetimeDefinition === 'second' && this.dateSecond !== undefined) {
            return this.dateSecond.value
        } else if (datetimeDefinition === 'microsecond' && this.dateMicrosecond !== undefined) {
            return this.dateMicrosecond.value
        } else {
            return 0
        }
    }
}

module.exports = DatetimeHelper