import { useRef, useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import { useClickedOrPressedOutside } from '../../hooks'
import { strings } from '../../utils'
import { APP } from '../../../conf'
import Layout from './layouts'

/**
 * This is a minimal component that also serves as a template for the daterangepicker. So we can use the same component
 * for both, picking a single date or a range of dates.
 * 
 * Yes, this has functions similar to the ones in the 'shared/flow/helpers/datetime.js' file. We don't use flow helpers here
 * because it'll be a HELL lot easier to maintain if we keep flow isolated from the rest and this also isolated.
 * 
 * It's important to understand that similar to other util components, this component is also self contained. It works on it's own
 * without the need of ANY external props. All of the props passed are optional and if they change outside of this component it
 * will reflect here. 
 * 
 * IMPORTANT: The format of the date is CLOSELY tied to the value. This means that for the given time we CANNOT support formats
 * like `D` for example. Imagine that `D` accepts `1` or `10` as value. We have no way of knowing if the user is typing 
 * `1/12/2020` or `11/2/2020`. So we cannot guess right the mask of the number. Also be aware, on `onChangeText` function we check
 * if the length of the string is equal to the length of the mask, if it is dynamic, you need to change this function.
 * 
 * @param {object} props - The props that the datepicker component recieves.
 * @param {(date: Date) => {} | undefined} [props.onChangeSelectedDate=null] - This is the callback function that will be called
 * when the user selects a date inside of the input.
 * @param {boolean} [props.isDatepickerOpen=false] - This is the boolean that determines if the datepicker is open or not, if you
 * are controlling the state of this component (if it's open or not) from the outside, you should pass this prop.
 * @param {(isOpen: boolean) => {} | undefined} [props.onChangeOpen=null] - This is the callback function that will be called
 * when the user opens the datepicker component, in other words, when he clicks on the input.
 * @param {boolean} [props.canSelectDateBelowToday=true] - This prop will determine if the user can select a date that
 * is below than today or not. If true than the user can select a date that is below than today. Otherwise the dates before 
 * than today will be blurred and he will not be able to click it.
 * @param {Array<string>} [props.daysOfTheWeek=['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']] - An array
 * of strings, to represent each day of the week. This array should have 7 elements only. The day of the week should start from
 * Sunday and end with Saturday. With this we can translate the day of the week on the fly, without depending in the user's 
 * predefined language.
 * @param {Array<string>} [props.months=['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']] - 
 * An array of strings where each string represent a month. This array should have 12 elements only. The month should start from
 * January and end with December. With this we can translate the month on the fly, without depending in the user's predefined language.
 * @param {string} [props.placeholder=''] - The placeholder of the input, after the user starts typing or before he selects a date we will
 * show this text.
 * @param {string} [props.dateFormat='DD/MM/YYYY'] - This is the format of the date that will be displayed inside the input. The possible 
 * date format types are the following:
 * - `YYYY` - 4 digits year
 * - `MM` - 2 digits month (for example 8 should be represented as 08)
 * - `mmm` - 3 letters month.
 * - `DD` - 2 digits day (for example 8 should be represented as 08)
 * @param {boolean} [props.doesAutoSelectDate=false] - This is the boolean that determines if the datepicker will automatically
 * select the date that is currently selected.
 * @param {Date} [props.dateSelected=new Date()] - The date that was selected by the user.
 * @param {boolean} [props.canUserWriteDate=true] - This is the boolean that determines if the user can write the date inside the input
 * or if the input will be read only.
 * @param {string} [props.containerBackgroundColor='#fff'] - The background color of the container that contains the datepicker.
 * @param {import('react').Component} [props.customInputComponent=import('./styles').Input] - This is the component that will be used as the input, 
 * it is where the user can use to write.
 * 
 * @param {import('React').ReactElement} - Returns a React element to be rendered. It is an input that when you click it opens
 * a datepicker component.
 */
export default function Datepicker(props) {
    const theme = useTheme() 
    
    const today = new Date()
    const doesAutoSelectDate = typeof props.doesAutoSelectDate === 'boolean' ? props.doesAutoSelectDate : false
    const containerBackgroundColor = typeof props.containerBackgroundColor === 'string' ? props.containerBackgroundColor : theme.white
    const canUserWriteDate = typeof props.canUserWriteDate === 'boolean' ? props.canUserWriteDate : true
    const defaultPlaceholder = typeof props.placeholder === 'string' ? props.placeholder : ''
    const isDatepickerOpen = typeof props.isDatepickerOpen === 'boolean' ? props.isDatepickerOpen : false 
    const onChangeSelectedDate = typeof props.onChangeSelectedDate === 'function' ? props.onChangeSelectedDate : null
    const onOpenDatepicker = typeof props.onOpenDatepicker === 'function' ? props.onOpenDatepicker : null
    const canSelectDateBelowToday = typeof props.canSelectDateBelowToday === 'boolean' ? props.canSelectDateBelowToday : true
    const daysOfTheWeek = Array.isArray(props.daysOfTheWeek) && props.daysOfTheWeek.length === 7 ? props.daysOfTheWeek : [
        strings('datePickerDayOfTheWeekSundayLabel'),
        strings('datePickerDayOfTheWeekMondayLabel'),
        strings('datePickerDayOfTheWeekTuesdayLabel'),
        strings('datePickerDayOfTheWeekWednesdayLabel'),
        strings('datePickerDayOfTheWeekThursdayLabel'),
        strings('datePickerDayOfTheWeekFridayLabel'),
        strings('datePickerDayOfTheWeekSaturdayLabel')
    ]
    const monthsOfTheYear = Array.isArray(props.monthsOfTheYear) && props.monthsOfTheYear.length === 12 ? props.monthsOfTheYear : [
        strings('datePickerMonthOfTheYearJanuaryLabel'),
        strings('datePickerMonthOfTheYearFebruaryLabel'),
        strings('datePickerMonthOfTheYearMarchLabel'),
        strings('datePickerMonthOfTheYearAprilLabel'),
        strings('datePickerMonthOfTheYearMayLabel'),
        strings('datePickerMonthOfTheYearJuneLabel'),
        strings('datePickerMonthOfTheYearJulyLabel'),
        strings('datePickerMonthOfTheYearAugustLabel'),
        strings('datePickerMonthOfTheYearSeptemberLabel'),
        strings('datePickerMonthOfTheYearOctoberLabel'),
        strings('datePickerMonthOfTheYearNovemberLabel'),
        strings('datePickerMonthOfTheYearDecemberLabel')
    ]
    const daysGridNumberOfRows = 6
    const daysGridNumberOfColumns = daysOfTheWeek.length
    const daysGridNumberOfDays = daysGridNumberOfRows * daysGridNumberOfColumns
    const dateSelected = (props.dateSelected instanceof Date) ? props.dateSelected : today
    const definedDateFormat = ![null, undefined].includes(props.dateFormat) ? props.dateFormat : 
        strings('datePickerDefaultFormat')
    const datePartsFormats = {
        YYYY: {
            represents: 'year',
            validateCharacterAtPosition: (character, position) => {
                const isCharacterANumber = /^\d$/.test(character)
                if (isCharacterANumber && [0, 1, 2, 3].includes(position)) return character
                else return ''
            },
            getValueFromDate: (date) => {
                return `${date.getFullYear()}`
            },
            getNumberFromValue: (value) => {
                return parseInt(value)
            }
        },
        MM: {
            represents: 'month',
            validateCharacterAtPosition: (character, position) => {
                const isCharacterANumber = /^\d$/.test(character)
                if (isCharacterANumber) {
                    if (position === 0 && parseInt(character) > 1) return `0${character}`
                    else return character
                }
                return ''
            },
            getValueFromDate: (date) => {
                const originalMonth = date.getMonth() + 1
                if (originalMonth < 10) return `0${originalMonth}`
                else return `${originalMonth}`
            },
            getNumberFromValue: (value) => {
                return parseInt(value) - 1
            }
        },
        mmm: {
            represents: 'month',
            validateCharacterAtPosition: (character, position) => {
                // Reference: https://stackoverflow.com/questions/3617797/regex-to-match-only-letters#comment117866996_3617818
                const isCharacterAText = /\p{Letter}/gu.test(character)
                if (isCharacterAText && [0, 1, 2].includes(position)) return character
                else return ''
            },
            getValueFromDate: (date) => {
                const originalMonth = date.getMonth()
                return monthsOfTheYear[originalMonth].slice(0, 3)
            },
            getNumberFromValue: (value) => {
                const findIndex = monthsOfTheYear.findIndex(month => month.toLowerCase().slice(0, 3) === value.toLowerCase())
                return findIndex
            }
        }, 
        DD: {
            represents: 'day',
            validateCharacterAtPosition: (character, position) => {
                const isCharacterANumber = /^\d$/.test(character)
                if (isCharacterANumber) {
                    if (position === 0 && parseInt(character) > 3) return `0${character}`
                    else return character
                }
                return ''
            },
            getValueFromDate: (date) => {
                const day = date.getDate()
                if (day < 10) return `0${day}`
                else return `${day}`
            },
            getNumberFromValue: (value) => {
                return parseInt(value)
            }
        }
    }

    const dateInputRef = useRef()
    const datePickerRef = useRef()
    const nonFormatRegex = useRef(null)
    const startAndEndPositionsOfFormatsInStringRef = useRef(null)
    const [dateFormat, setDateFormat] = useState(definedDateFormat)
    const [placeholder, setPlaceholder] = useState(defaultPlaceholder)
    const [daysOfTheCurrentMonth, setDaysOfTheCurrentMonth] = useState(getMonthDays(dateSelected.getFullYear(), dateSelected.getMonth()))
    const [isInputFocused, setIsInputFocused] = useState(isDatepickerOpen)
    const [selectedDate, setSelectedDate] = useState(dateSelected)
    const [currentYear, setCurrentYear] = useState(dateSelected.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(dateSelected.getMonth())
    const [positionAndMaxHeight, setPositionAndMaxHeight] = useState({
        position: { x: 0, y: 0 }, 
        maxHeight: null, 
        wasCalculated:false
    })
    const [dateValue, setDateValue] = useState('')
    useClickedOrPressedOutside({
        customRef: dateInputRef, 
        callback: (e) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                onToggleInputFocus(false)
            }
        }
    })

    /**
     * Get the regex for the parts of the string that are not formats. So on the example date format: 
     * YYYY-MM::DD
     * We will have the regex like the following: (-)?(:)?. This way we can do dateFormat.replace(/(-)?(:)?/g, '')
     * 
     * @param {boolean} [forceRefresh=false] - If true, the cache will be refreshed so we need to regenerate it.
     */
    function getNonDatePartFormatRegex(forceRefresh=false) {
        if (nonFormatRegex.current !== null && !forceRefresh) {
            return nonFormatRegex.current
        } else {
            const dateFormatPartsRegex = Object.keys(datePartsFormats).map(format => `(${format})?`).join('')
            nonFormatRegex.current = [...new Set(definedDateFormat.replaceAll(new RegExp(dateFormatPartsRegex, 'g'), '').split(''))].map(format => `(${format})?`).join('')
        }
    }

    /**
     * Function used for saving the format positions in the cache of this component. Format positions are, for example:
     * {
     *      0: {position: 0, format: 'YYYY'}, 
     *      1: {position: 1, format: 'YYYY'}, 
     *      2: {position: 2, format: 'YYYY'},
     *      3: {position: 3, format: 'YYYY'},
     *      5: {position: 0, format: 'MM'},
     *      6: {position: 1, format: 'MM'},
     * } 
     * 
     * What this means is that from index 0 to index 3 we have the format 'YYYY' and from index 5 to index 6 we have the format 'MM'. And on position 5
     * we have the first character of the month value (with this we can prevent certain numbers at specific positions, for exmaple, on the month, the position 0)
     * can only be 1 or 0, and the position 1 can only be 0 to 9.
     * 
     * @param {boolean} [forceRefresh=false] - If true, the cache will be refreshed.
     */
    function getFormatPositions(forceRefresh=false) {
        if (startAndEndPositionsOfFormatsInStringRef.current !== null && !forceRefresh) {
            return startAndEndPositionsOfFormatsInStringRef.current
        } else {
            startAndEndPositionsOfFormatsInStringRef.current = {}
            for (const validDateFormat of Object.keys(datePartsFormats)) {
                const formatRegex = new RegExp(validDateFormat, 'g')
                const doesFormatPartExistsInDateFormat = formatRegex.test(definedDateFormat)
                if (doesFormatPartExistsInDateFormat) {
                    const startingPositionOfFormat = definedDateFormat.indexOf(validDateFormat)
                    const endindPositionOfFormat = startingPositionOfFormat + validDateFormat.length - 1
                    for (let i = startingPositionOfFormat; i <= endindPositionOfFormat; i++) {
                        startAndEndPositionsOfFormatsInStringRef.current[i] = {
                            position: i - startingPositionOfFormat,
                            format: validDateFormat
                        }
                    }
                }
            }
        }
    }

    /**
     * Function used for retrieving all of the days of the month of the year. This will loop by the daysGridNumberOfDays and with that we will create a new 
     * array of Date object instances instances.
     * 
     * We then use this array to populate the `daysOfTheCurrentMonth` state with the dates of the current, the previous and the next month. 
     * (Not all of the dates but the ones needed to fill the grid of the calendar)
     * 
     * @param {number} year - The year of the month we want to get the days of.
     * @param {number} month - The month of the year we want to get the days of.
     * 
     * @returns {Date[]} - An array of Date objects.
     */
    function getMonthDays(year, month) {
        const monthDayOfTheWeekStart = (new Date(year, month)).getDay()
        let monthArray = []

        for (let index=0; index < daysGridNumberOfDays; index++) {
            const dayOfTheWeek = index - monthDayOfTheWeekStart
            const date = new Date(year, month, dayOfTheWeek+1)
            monthArray.push(date)
        }
        return monthArray
    }

    /**
     * / * WEB ONLY * /
     * 
     * If we are rendering the date picker on the web, what we need to do is that we need to calculate the position and the max height of it.
     * Because what we do is that we render the datepicker on a fixed position AND NOT on an absolute position. This means that the datepicker is
     * rendered "above" of the content, and the content will stay behind of the datepicker. This means all of the elements outside of the datepicker 
     * are not clickable except the date picker itself.
     * 
     * So since we render on a fixed position we need to calculate if we will render this datepicker above or below the input, and the max height of it 
     * (there is no scroll).
     */
    function webRenderOnTopOrBottomAndGetPosition() {
        if (APP === 'web') {
            const dateInputRect = dateInputRef.current.getBoundingClientRect()
            const datePickerRect = datePickerRef.current.getBoundingClientRect()
            const bottomOfInput = dateInputRect.bottom
            const doesDatePickerPassBottom = bottomOfInput + datePickerRect.height > window.innerHeight
            if (doesDatePickerPassBottom === true) {
                let yPosition = dateInputRect.top - datePickerRect.height
                if (yPosition < 0) yPosition = 0
                setPositionAndMaxHeight({
                    wasCalculated: true,
                    position: { x: dateInputRect.left, y: yPosition }, 
                    maxHeight: dateInputRect.top
                })
            } else {
                let yPosition = dateInputRect.bottom
                setPositionAndMaxHeight({
                    wasCalculated: true,
                    position: { x: dateInputRect.left, y: yPosition }, 
                    maxHeight: window.innerHeight - yPosition
                })
            }
        }
    }

    /**
     * Function used for effectively converting the input string to the actual selected date.
     * 
     * What happens is that while the user typing, we cannot convert it to a real date object.
     * What we need to do is wait until the user finishes typing the hole date to update the selected date.
     * For that to work what we do is that we store each part of the date `year`, `month` and `day` in the 
     * `dateInformation` store state, and then when we want, with this retrieve the actual date of the date typed
     * we use the `getDateValue` function.
     * 
     * After that we update the `selectedDate` state with the new date generated from the value.
     * 
     * @param {string} formatedValue - The value formated of the date (actually the input value).
     */
    function convertValueToDate(formatedValue) {
        /**
         * Works like a store, for storing each part of the date so we can retrieve it later.
         */
        function dateInformation () {
            let dateParts = {
                year: null,
                month: null,
                day: null
            }
            return {
                storeDateValue: (datePart, value) => {
                    dateParts[datePart] = value
                },
                getDateValue: (datePart) => {
                    return dateParts[datePart]
                }
            }
        }
        const dateInformationStore = dateInformation()

        for (const validDateFormat of Object.keys(datePartsFormats)) {
            const formatRegex = new RegExp(validDateFormat, 'g')
            const doesFormatPartExistsInDateFormat = formatRegex.test(definedDateFormat)
            if (doesFormatPartExistsInDateFormat === true) {
                let formatIndex = definedDateFormat.indexOf(validDateFormat)
                if (formatIndex !== -1) {
                    const datePartFormatRepresents = datePartsFormats[validDateFormat].represents
                    let valueExtracted = formatedValue.substring(formatIndex, formatIndex + validDateFormat.length)
                    valueExtracted = datePartsFormats[validDateFormat].getNumberFromValue(valueExtracted)
                    dateInformationStore.storeDateValue(datePartFormatRepresents, valueExtracted)
                }
            }
        }

        const date = new Date(
            dateInformationStore.getDateValue('year'), 
            dateInformationStore.getDateValue('month'), 
            dateInformationStore.getDateValue('day')
        )
        onSelectDate(date)
    }

    /**
     * Function used for beautifuly format the date in the input. Yep, although this component is a Datepicker component, ofter times the user will want
     * to write the date instead of picking it from the calendar. It's a feedback we recieved from our users/clients, so this is definetly needed for the
     * datepicker.
     * 
     * So what this does is, as the user types the date we will format it inside of the input from the format given to this component, if no format is given 
     * we will use the default format 'YYYY-MM-DD'. This works similar to a mask, the user can only change the numbers/characters that are valid in the input
     * not the ones outside of it. For example. YYYY-MM::DD, YYYY, MM and DD are defined in `datePartsFormats` so the characters '-' and ':' the user cannot 
     * change in the string.
     * 
     * So how does this work:
     * 1 - We run the `getNonDatePartFormatRegex` to get the regex for the parts of the string that are not formats. So on the example above we will have the regex
     * like the following: (-)?(:)?. This way we can do dateFormat.replace(/(-)?(:)?/g, '')
     * 2 - We get the format positions, for example: {
     *      0: {position: 0, format: 'YYYY'}, 
     *      1: {position: 1, format: 'YYYY'}, 
     *      2: {position: 2, format: 'YYYY'},
     *      3: {position: 3, format: 'YYYY'},
     *      5: {position: 0, format: 'MM'},
     *      6: {position: 1, format: 'MM'},
     * } 
     * 
     * What this means is that from index 0 to index 3 we have the format 'YYYY' and from index 5 to index 6 we have the format 'MM'. And on position 5
     * we have the first character of the month value (with this we can prevent certain numbers at specific positions, for exmaple, on the month, the position 0)
     * can only be 1 or 0, and the position 1 can only be 0 to 9.
     * 3 - We replace the date value removing all of the parts that are non date values. (For example, the '-' and ':' characters) and then split the string.
     * 4 - Retrieve the formated value from the value splitted.
     * 
     * 5(optional) - If the length of the formated value is EQUAL the length of the dateFormat, we will then automatically select a date using the
     * `convertValueToDate` function.
     * 
     * @param {string} newValue - The date value of the input that we want to change and format.
     */
    function onChangeText(newValue) {
        /**
         * Retrieves the value formated. We do that by looping the splitted value and adding the numbers in the desired format.
         * BEAWARE: We change the loop inside of the loop by defining the offset index, this means that if we recieve only numbers,
         * and we add '-' between the date, we will add it to the offsetIndex. For example: YYYY-MM-DD, the offsetIndex will be 2.
         * 
         * @param {Array<string>} valueSplitted - The value of the string with each character splitted inside an array.
         * 
         * @returns {string} - The value formated.
         */
        function getFormatedValue(valueSplitted) {
            let formatedValue = ''
            let offsetIndex = 0
            
            for (let i=0; i < valueSplitted.length + offsetIndex; i++) {
                const characterAtPositionInValue = valueSplitted[i-offsetIndex]
                const formatInPosition = startAndEndPositionsOfFormatsInStringRef.current[i]
                if (formatInPosition !== undefined) {
                    const datePartFormat = datePartsFormats[formatInPosition.format]
                    formatedValue += datePartFormat.validateCharacterAtPosition(characterAtPositionInValue, formatInPosition.position)
                } else if (definedDateFormat[i] !== undefined) {
                    const nonFormatCharacter = definedDateFormat[i]
                    formatedValue += nonFormatCharacter
                    if (nonFormatCharacter !== characterAtPositionInValue) offsetIndex++
                }
            }
            return formatedValue
        }

        getNonDatePartFormatRegex()
        getFormatPositions()

        const valueSplitted = newValue.replace(new RegExp(nonFormatRegex.current, 'g'), '').split('')
        let formatedValue = getFormatedValue(valueSplitted)        

        if (formatedValue.length !== definedDateFormat.length) {
            setDateValue(formatedValue)
        } else {
            convertValueToDate(formatedValue)
        }
    }
    
    /**
     * This will pass or reduce the current month from the date array. This is activated and used when the user clicks on the arrows
     * to change the month.
     * 
     * When we do that what we do is that we change the current month and the current year. If the month is below 0, we will subtract 
     * a year, otherwise, if the month is above 11 we will add a year.
     * 
     * After everything we change the daysOfTheCurrentMonth state with new days to use.
     */
    function onAddOrReduceCurrentMonth(amount) {
        let newMonth = currentMonth + amount
        let newYear = currentYear
        if (newMonth > 11) {
            newMonth = 0
            newYear++
        } else if (newMonth < 0) {
            newMonth = 11
            newYear--
        }        
        setCurrentMonth(newMonth)
        setCurrentYear(newYear)
        setDaysOfTheCurrentMonth(getMonthDays(newYear, newMonth))
    }

    /**
     * This function is used for when the user selects a day from the datepicker calendar. It can also be used for when the user
     * finishes typing the date in the input. This will effectively change the date of the input. I mean, while the user is typing
     * the date of the input WILL NOT change, it will only reflect a change when the user finishes typing the date. It's nice that we
     * do not use ANY TYPE of library here so any new format that you might want to support, you can do it, and just add the logic.
     * 
     * After everything has been changed we also notify the parent component about the new date passing the date object selected.
     * 
     * @param {Date} date - A date instance that was selected by the user or typed.
     */
    function onSelectDate(date) {
        if (canSelectDateBelowToday === false && date > today || canSelectDateBelowToday === true) {
            const year = date.getFullYear()
            const month = date.getMonth()
            setSelectedDate(date)
            setCurrentMonth(month)
            setCurrentYear(year)
            setDaysOfTheCurrentMonth(getMonthDays(year, month))

            let newDateValue = definedDateFormat
            for (const validDateFormat of Object.keys(datePartsFormats)) {
                const formatRegex = new RegExp(validDateFormat, 'g')
                const doesFormatPartExistsInDateFormat = formatRegex.test(definedDateFormat)
                if (doesFormatPartExistsInDateFormat) {
                    newDateValue = newDateValue.replace(formatRegex, datePartsFormats[validDateFormat].getValueFromDate(date))
                }
            }
            setDateValue(newDateValue)

            if (onChangeSelectedDate !== null) {
                onChangeSelectedDate(date)
            }
        }
    }

    /**
     * Toggles if the datepicker is open or closed. If true then the datepicker will open, otherwise it will close.
     * When we open the datepicker and we are on the web we will get the position it will be rendered (top or bottom).
     * Otherwise, if we are on the web and we close the datepicker we will set the position and maxHeight to not calculated.
     * 
     * @param {boolean} isOpen - If true then the datepicker will open, otherwise it will close.
     */
    function onToggleInputFocus(isOpen=!isInputFocused) {
        setIsInputFocused(isOpen)
        
        if (onOpenDatepicker !== null) {
            onOpenDatepicker(isOpen)
        }

        if (isOpen === true && APP === 'web') {
            setTimeout(() => {
                webRenderOnTopOrBottomAndGetPosition()                
            }, 1)
        } else if (isOpen === false && APP === 'web') {
            setPositionAndMaxHeight({ ...positionAndMaxHeight, wasCalculated: false })
        }
    }

    /**
     * On the first render, if the datepicker is open, then we will run this function. This effect will
     * run the `onToggleInputFocus` function with the `isOpen` parameter set to true. With that we set
     * the position of the datepicker, and after that we will also focus on the input.
     * 
     * If we define the `doesAutoSelectDate` as true, then we will also select the date of the input. This automatically
     * selects the date and display it on the input.
     */
    useEffect(() => {
        if (isDatepickerOpen === true) {
            onToggleInputFocus(true)
            if (dateInputRef.current) dateInputRef.current.focus()
        }
        if (doesAutoSelectDate === true) {
            onSelectDate(selectedDate)
        }
    }, [])

    /**
     * This effect will run when the datepicker opens outside of this component, when the outside user wants for some reason
     * open the datepicker, we will just update the local state with the new state of the `isInputFocused`
     */
    useEffect(() => {
        if (typeof props.isDatepickerOpen === 'boolean' && props.isDatepickerOpen !== isInputFocused) {
            onToggleInputFocus(isDatepickerOpen)
            if (props.isDatepickerOpen === true && dateInputRef.current) dateInputRef.current.focus()
        }
    }, [props.isDatepickerOpen])

    /**
     * Effect for running when the dateSelected changes, so, outside of the datepicker component, when the date changes
     * we will update the local state with the new date.
     */
    useEffect(() => {
        if (props.dateSelected instanceof Date) {
            const isDifferentFromInternalDate = dateSelected.getDate() !== props.dateSelected.getDate() &&
                dateSelected.getMonth() !== props.dateSelected.getMonth() &&
                dateSelected.getFullYear() !== props.dateSelected.getFullYear()
            if (isDifferentFromInternalDate) {
                onSelectDate(props.dateSelected)
            }
        }
    }, [props.dateSelected])

    /**
     * This useEffect will be fired whenever the date format changes. That's exactly why we need to store the date format
     * in the state, because when it changes we can know it has changed.
     * 
     * Everytime the date format changes we will also update the selected date value.
     */
    useEffect(() => {
        getFormatPositions(true)
        getNonDatePartFormatRegex(true)
        if (props.dateFormat !== dateFormat) {
            setDateFormat(props.dateFormat)
            onSelectDate(selectedDate)
        }
    }, [props.dateFormat])

    /**
     * Effect for when the user changes the placeholder from outside of the datepicker component. This will update
     * the local state with the new placeholder. This will show in the input.
     */
    useEffect(() => {
        if (typeof props.placeholder === 'string' && props.placeholder !== placeholder) {
            setPlaceholder(props.placeholder)
        }
    }, [props.placeholder])

    return (
        <Layout
        datePickerRef={datePickerRef}
        dateInputRef={dateInputRef}
        containerBackgroundColor={containerBackgroundColor}
        customInputComponent={props.customInputComponent}
        canUserWriteDate={canUserWriteDate}
        placeholder={placeholder}
        isInputFocused={isInputFocused}
        onToggleInputFocus={onToggleInputFocus}
        onChangeText={onChangeText}
        onAddOrReduceCurrentMonth={onAddOrReduceCurrentMonth}
        monthsOfTheYear={monthsOfTheYear}
        currentMonth={currentMonth}
        currentYear={currentYear}
        daysOfTheWeek={daysOfTheWeek}
        dateValue={dateValue}
        onSelectDate={onSelectDate}
        positionAndMaxHeight={positionAndMaxHeight}
        daysGridNumberOfRows={daysGridNumberOfRows}
        daysGridNumberOfColumns={daysGridNumberOfColumns}
        daysOfTheCurrentMonth={daysOfTheCurrentMonth}
        today={today}
        canSelectDateBelowToday={canSelectDateBelowToday}
        selectedDate={selectedDate}
        />
    )
}