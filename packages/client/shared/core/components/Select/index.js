import { useRef, useState, useEffect } from 'react'
import { useClickedOrPressedOutside } from '../../hooks' 
import { generateUUID } from '../../../../../shared/utils'
import { APP } from '../../../conf'
import Layout from "./layouts"

/**
 * This is a select component, it is used for displaying a custom select component instead of the default <select> 
 * from the browser.
 * 
 * By design it allows only one option to be selected at a time, but if you want you can set the ability to select 
 * multiple values. Also, when selecting multiple values you also have the ability to set the maximum number of
 * options the user is able to select.
 * 
 * It's important to understand that this is an atom component, it has the most basic UI in it. We will not define any
 * styling for the input/container by default. We will just add styles to the options, and the selected options, but we
 * can at any time override this styles if your own styles.
 * 
 * This component is created so it is able to hold all of the state it needs in order to work, most, if not all, 
 * props are completly optional. If you don't pass any prop it will just work out of the box.
 * 
 * @param {Object} props - The props that this component is able to recieve.
 * @param {Array<{
 *      label: string, 
 *      value: string | number
 * }>} [props.options=[]] - The options that the user can select from when we open the select options menu.
 * You see that 'label' and `value` are both required for each option but you can also set `optionComponent`
 * and `selectedComponent` to render a custom component instead of the default. The `optionComponent` will render
 * a custom component on the option dropdown container. This is tied to the `optionComponents` prop.
 * The `selectedComponent` will render a custom component of the selected options. This is tied to the 
 * `selectedComponents` prop.
 * @param {Array<string | number>} [props.selectedOptions=[]] - The options that are currently selected, this is an array of
 * the `option.value` defined in the `options` prop
 * @param {string} [props.search=''] - The search term that the user is currently typing in. This will update the 
 * value of the `search` so we can filter the options based on this option.
 * @param {(search: string) => void} [props.onSearch=undefined] - The function that will be called when the user
 * types in the search input. Be aware that when this is defined we will not do any filtering of the options, you
 * will need to do it yourself.
 * @param {boolean} [props.multiple=false] - If this is set to true, then the user will be able to select multiple
 * options instead of just one.
 * @param {number} [props.maximumSelectedOptions=undefined] - If the `multiple` prop is set to true, then this will 
 * set the maximum number of options that the user is able to select.
 * @param {boolean} [props.disabled=false] - If this is set to true, then the user will not be able to select or remove
 * any of the options.
 * @param {string} [props.placeholder=''] - The placeholder text that will be displayed when the user has not selected anything
 * and when the user is not typing on the input.
 * @param {boolean} [props.open=false] - If this is set to true, then the options container will be displayed at the bottom
 * of the input, otherwise it will be hidden.
 * @param {(isOpen: boolean) => void} [props.onOpen=undefined] - This is a callback that will be called when the user opens or closes
 * the select options menu. By default it recieves if the option container is opening or closing.
 * @param {(option: {label: string, value: string | number}) => void} [props.onSelect=undefined] - This is a callback that will be called when 
 * the user selects an option. It recieves the hole option object that was selected. This means you can append more data to the options
 * besides the default `label` and `value` properties.
 * @param {(option: {label: string, value: string | number}) => void} [props.onRemove=undefined] - This is a callback that will be called when
 * the user removes an option. It recieves the hole option object that was removed. This means you can append more data to the options
 * besides the default `label` and `value` properties.
 * @param {import('react').Component | (props) => import('react').ReactElement | null} [props.optionComponent=null] - This is an object 
 * that holds all of the custom components to load on the options. Each key is the name of the component to use that was defined in the `optionComponent` property
 * in `props.options`
 * @param {import('react').Component | (props) => import('react').ReactElement | null} [props.selectedComponent=null] - This is an object 
 * that holds all of the custom components to load on the selected options. Each key is the name of the component to use that was defined in the `selectedComponent`
 * property in `props.options`
 * @param {object} [props.customProps={}] - This are custom props that will be passed to the `optionComponents` and to the `selectedComponents`
 * This way you can pass functions and any kind of stuff.
 * @param {boolean} [props.creatable=false] - If we search for an option and it does not exist, then we will show a button below
 * to create it. 
 * @param {(optionLabel: string, ...any) => void} [props.onCreateOption=undefined] - This is a callback that will be called when the user clicks on the
 * button to create a new option. For this to be called `creatable` must be set to true.
 * @param {import('react').Component | (props) => import('react').ReactElement} [props.customCreateOptionComponent=undefined] - This is a ref that will be passed 
 * to the select options container
 * @param {string} [props.customHelperLabel=undefined] - This is the label that will be displayed at the top of the select options container before all of the options
 * are displayed.
 * 
 * @returns {import('react').ReactElement} - Returns a react element.
 */
export default function Select(props) {
    const isPropsPlaceholderDefined = typeof props.placeholder === 'string'
    const isPropsOpenDefined = typeof props.open === 'boolean'
    const isPropsSelectedOptionsDefined = Array.isArray(props.selectedOptions)
    const isPropsOptionDefined = Array.isArray(props.options)
    const isPropsSearchDefinedAndAString = ![null, undefined].includes(props.search) && typeof props.search === 'string'
    const canAddMultiple = typeof props.multiple === 'boolean' ? props.multiple : false
    const maximumSelectedOptions = typeof props.maximumSelectedOptions === 'number' ? props.maximumSelectedOptions : undefined
    const isDisabled = typeof props.disabled === 'boolean' ? props.disabled : false
    const placeholder = isPropsPlaceholderDefined ? props.placeholder : ''
    const initialSelectedOptions = isPropsSelectedOptionsDefined ? props.selectedOptions : []
    const customProps = typeof props.customProps === 'object' ? props.customProps : {}
    const isCreatable = typeof props.creatable === 'boolean' ? props.creatable : false

    const selectRef = useRef()
    const searchInputRef = useRef()
    const optionsContainerRef = useRef()
    const preventCloseRef = useRef(false)
    const selectedOptionsRef = useRef(initialSelectedOptions)
    const [isToShowCreatable, setIsToShowCreatable] = useState(isPropsSearchDefinedAndAString && isCreatable && props.search !== '')
    const [searchInputWidth, setSearchInputWidth] = useState(isPropsPlaceholderDefined ? props.placeholder.length : 1)
    const [isToLoadOptionsOnBottom, setIsToLoadOptionsOnBottom] = useState(true)
    const [isOpen, setIsOpen] = useState(isPropsOpenDefined ? props.open : false)
    const [search, setSearch] = useState(isPropsSearchDefinedAndAString ? props.search : '')
    const [selectedOptions, _setSelectedOptions] = useState(initialSelectedOptions)
    const [originalOptions, setOriginalOptions] = useState(isPropsOptionDefined ? props.options : [])
    const [filteredOptions, setFilteredOptions] = useState(
        isPropsOptionDefined ? 
        isPropsSelectedOptionsDefined ? 
        props.options.filter(option => !props.selectedOptions.includes(option.value)) : 
        props.options : [])
    useClickedOrPressedOutside({ 
        customRef: selectRef, 
        callback: webCloseWhenUserPressesOutside 
    })

    function setSelectedOptions(newSelectedOptions) {
        _setSelectedOptions(newSelectedOptions)
        selectedOptionsRef.current = newSelectedOptions
    }

    /**
     * / * WEB ONLY * /
     * 
     * We close the options container when the user clicks outside of the select container.
     * So when he clicks anywhere outside of the select container we will toggle the options container to close.
     * 
     * This is available only on web because on mobile we do not open a dropdown, instead we open a modal that consumes
     * the hole height and width of the screen.
     */
    function webCloseWhenUserPressesOutside() {
        if (APP === 'web') onToggleOpen(false)
    }

    /**
     * This will be called on the onInput event to change the size of the input as he types.
     * We use the idea of using `ch` units to define the width of the input.
     * 
     * Reference: https://stackoverflow.com/a/43488899
     * 
     * @param {string} value - The value the user is typing on the input.
     */
    function adjustWidthOfSearchInput(value) {
        if (searchInputRef.current) {
            let valueLength = value.length
            if (selectedOptionsRef.current.length === 0 && isPropsPlaceholderDefined && valueLength < props.placeholder.length) {
                valueLength = props.placeholder.length
            }
            setSearchInputWidth(valueLength < 1 ? 1 : valueLength)
        }
    }

    /**
     * / * WEB ONLY * /
     * 
     * This will automatically define if the options container is going to be loaded on the top or on the bottom of the input. If it's on the bottom
     * we don't need to do anything, if it's on the top we need to adjust the offset so we can move the options container up.
     * 
     * To calculate this we get the bounding rect for both the `select` input and the `optionsContainer` and we compare the top of the and 
     * we use this to define if the select will surpass the bottom of the screen.
     */
    function webAutomaticDefineWhereToRenderOptionsAndAdjustOffset() {
        if (optionsContainerRef.current) {
            const selectRect = selectRef.current.getBoundingClientRect()
            const optionsContainerRect = optionsContainerRef.current.getBoundingClientRect()
            const maximumHeightOfPage = window.innerHeight
            const bottomPositionOfOptionsContainer = optionsContainerRect.height + selectRect.y + selectRect.height
            const isOptionsContainerBiggerThanWindow = bottomPositionOfOptionsContainer > maximumHeightOfPage
            if (isOptionsContainerBiggerThanWindow) {
                setIsToLoadOptionsOnBottom(false)
            } else {
                setIsToLoadOptionsOnBottom(true)
            }
        }
    }
    
    /**
     * This will be called when we want to open or close the options container. When we are closing the container
     * we will also reset the search input value, and if on mobile, we will also blur on the input. (This means we 
     * will loose focus on the input).
     * Similar to `onSearch` if `props.onOpen` is defined we send the `isOpen` state to the callback.
     *  
     * On the web, when we open the select menu we automatically define if we need to open it on the bottom or the top.
     * We will open at the bottom if there is space there, if there is no space at the bottom we will open at the top.
     * 
     * @param {boolean} [isSelectOpen=!isOpen] - If the select is open or closed, by default, since it's a toggle this is
     * the negative of `isOpen`.
     */
    function onToggleOpen(isSelectOpen=!isOpen) {
        const nextState = isSelectOpen
        if (isDisabled === true && nextState === true) return
        
        setIsOpen(nextState)

        if (nextState === false) {
            setSearch('')
            if (APP === 'web' && searchInputRef.current) searchInputRef.current.blur()
        } else {
            onSearch('')
            if (APP === 'web') {
                if (searchInputRef.current) searchInputRef.current.focus()
            }
        }
            
        const isPropsOnOpenDefined = typeof props.onOpen === 'function'
        if (isPropsOnOpenDefined) {
            props.onOpen(nextState)
        }
    }

    /**
     * This is called when we select an option from the options container but also when we want
     * to remove a specific option selected. This is also called when we remove an option from the 
     * input.
     * 
     * By design the select input can have multiple options selected. This can be done by passing the `props.multiple`
     * props to the component. Which will tell if the component can have multiple options selected or not.
     * 
     * Also, the programmer can set the maximum number of options that can be selected by passing the 
     * `props.maximumSelectedOptions`. So if the user is adding an option and HE CANNOT add multiple options,
     * then we will replace the last option with the new one. 
     * If the user can add multiple options, then we will check if he set the `props.maximumSelectedOptions`, if it passes
     * the maximum number of options we will not add it. If he didn't we will just add.
     * 
     * Last but not least, when he selects an option we set the seach value to be an empty string. And we also filter
     * the remaining options to show just those that were not selected.
     * 
     * @param {{value: string, label: string }} option - The option that was selected. By default we will recieve the hole
     * option object. This is because, although `value` and `label` are required, we can also append custom properties
     * to the option that we can pass to custom components.
     * @param {boolean} [disabled=false] - If this is set to true, then we will not be able to select or remove any option
     * from the input.
     */
    function onSelectOrRemoveOption(option, disabled=isDisabled) {
        if (disabled === false) {
            const isRemovingAOption = selectedOptionsRef.current.includes(option.value)
            let newSelectedOptions = selectedOptions
            if (isRemovingAOption) {
                // Is REMOVING an option
                newSelectedOptions = selectedOptionsRef.current.filter(selectedOption => selectedOption !== option.value)

                const isPropsOnRemoveDefined = typeof props.onRemove === 'function'
                if (isPropsOnRemoveDefined) {
                    props.onRemove(option)
                }
            } else {
                // is ADDING an option
                let canAddOption = false
                if (selectedOptionsRef.current.length > 0) {
                    if (canAddMultiple) {
                        if (maximumSelectedOptions !== undefined && selectedOptionsRef.current.length + 1 <= maximumSelectedOptions) {
                            canAddOption = true
                        } else if (maximumSelectedOptions === undefined) {
                            canAddOption = true                    
                        }
                    } else {
                        // if the user can add just one option we will replace its content with the new option
                        newSelectedOptions = [option.value]
                    }
                } else {
                    canAddOption = true
                }
    
                if (canAddOption) newSelectedOptions = [...selectedOptionsRef.current, option.value]

                const isPropsOnSelectDefined = typeof props.onSelect === 'function'
                if (isPropsOnSelectDefined) {
                    props.onSelect(option)
                }

                if (isOpen === true && canAddMultiple === false) onToggleOpen(false)
            }
    
            setSelectedOptions(newSelectedOptions)
            adjustWidthOfSearchInput(isRemovingAOption ? search : '')
            onSearch('', originalOptions, newSelectedOptions)
        }
    }

    /**
     * This will change the value of the search input as he types, it will also filter by the options label.
     * 
     * The filtering only happens if no `onSearch` prop is defined. When the value is an empty string, then
     * it will show all of the options again.
     * 
     * After we finish filtering we fix the container offset so the options comes down.
     * 
     * @param {string} value - The value the user is typing on the input.
     */
    function onSearch(value, defaultOptions=originalOptions, optionsSelected=selectedOptions) {
        setSearch(value)
        const isPropsOnSearchCallbackDefinedAndAFunction = ![null, undefined].includes(props.onSearch) && 
            typeof props.onSearch === 'function'
        if (isPropsOnSearchCallbackDefinedAndAFunction) {
            props.onSearch(value)
        } else {
            let filteredOptions = defaultOptions.filter(option => !optionsSelected.includes(option.value))
            if (value !== '') {
                filteredOptions = filteredOptions.filter(option => option.label.toLowerCase().includes(value.toLowerCase()))
            }

            if (isCreatable === true) {
                // This is for optimization, we do not need to loop through the default options if the value is false
                if (value !== '') {
                    const doesExistOptionWithExactValue = defaultOptions.filter(option => option.label === value).length > 0
                    if (doesExistOptionWithExactValue === false) setIsToShowCreatable(true)
                    else setIsToShowCreatable(false)
                } else {
                    setIsToShowCreatable(false)
                }
            }

            setFilteredOptions(filteredOptions)
        }
    }

    /**
     * If we set `creatable` when the user searches for an option that does not exist, then we will show a button at the bottom 
     * for him to create the new option.
     * 
     * When he clicks this button then we run this function, when running this function we will see if `props.onCreateOption` is defined,
     * if it is then your parent must handle this option creation. Otherwise we handle it here. (remember that this component must be
     * responsible for his own state, it doesn't need to depend on any external dependencies). So if that's the case
     * we have 2 options:
     * 
     * 1. We retrieve the last element of the options array and then create a new object with it changing the value to a new uuid
     * and the label to the search value. We do this because if any custom component was defined, then we will still use it.
     * 2. We create a new object with the value to a new uuid and the label to the search value.
     * 
     * After that we change the original options array and set the search value to an empty string.
     * 
     * @param {...any} args - The arguments that were passed to the function, these args will be passed to the 
     * `props.onCreateOption` callback.
     */
    function onCreateOption(...args) {
        const optionValue = search
        const isOnCreateOptionDefined = typeof props.onCreateOption === 'function'
        if (isOnCreateOptionDefined) {
            props.onCreateOption(optionValue, ...args)
            onSearch('')
        } else {
            const hasElementsInOptionsArray = originalOptions.length > 0
            const newOptions = originalOptions
            // With this we can use the custom components.
            if (hasElementsInOptionsArray) {
                const lastElementInOriginalOptions = {...originalOptions[originalOptions.length - 1]}
                lastElementInOriginalOptions.label = optionValue
                lastElementInOriginalOptions.value = generateUUID()
                newOptions.push(lastElementInOriginalOptions)
            } else {
                newOptions.push({
                    label: optionValue,
                    value: generateUUID()
                })
            }
            setOriginalOptions(newOptions)
            onSearch('', newOptions, selectedOptions)
        }
        if (APP === 'web' && searchInputRef.current) searchInputRef.current.focus()
    }

    useEffect(() => {
        if (APP === 'web') window.addEventListener('resize', webAutomaticDefineWhereToRenderOptionsAndAdjustOffset)
        return () => {
            if (APP === 'web') window.removeEventListener('resize', webAutomaticDefineWhereToRenderOptionsAndAdjustOffset)
        }
    }, [])
    
    /** 
     * This will update the local state of the search input value that comes from the parent component.
     * If the parent component set the `props.search` to be something different than the current value
     * of the search here, then we will update this local state with the parent value.
     */
    useEffect(() => {
        if (isPropsSearchDefinedAndAString && search !== props.search) {
            onSearch(props.search)
        } 
    }, [props.search])
    
    /**
     * Nothing much to say, if the options have changed in the parent component then we will update the options
     * here in this component.
     */
    useEffect(() => {
        if (isPropsOptionDefined && JSON.stringify(originalOptions) !== JSON.stringify(props.options)) {
            setOriginalOptions(props.options)
            onSearch(search, props.options)
        }
    }, [props.options])
    
    useEffect(() => {
        if (isPropsSelectedOptionsDefined && JSON.stringify(selectedOptions) !== JSON.stringify(props.selectedOptions)) {
            if (props.selectedOptions.length > 0) {
                setSelectedOptions(props.selectedOptions.slice(0, -1))
                const selectedOption = originalOptions.find(option => option.value === props.selectedOptions[props.selectedOptions.length - 1])
                onSelectOrRemoveOption(selectedOption)
            } else {
                setSelectedOptions([])
            }
        }
    }, [props.selectedOptions])
    
    useEffect(() => {
        adjustWidthOfSearchInput(search)
    }, [props.placeholder])

    useEffect(() => {
        if (isOpen ===  true) webAutomaticDefineWhereToRenderOptionsAndAdjustOffset()
    }, [isOpen])

    const filteredSelectedOptions = originalOptions.filter(option => selectedOptions.includes(option.value))

    return (
        <Layout
        optionsContainerRef={optionsContainerRef}
        preventCloseRef={preventCloseRef}
        selectRef={selectRef}
        searchInputRef={searchInputRef}
        customProps={customProps}
        customHelperLabel={props.customHelperLabel}
        customCreateOptionComponent={props.customCreateOptionComponent}
        optionComponent={props.optionComponent}
        selectedComponent={props.selectedComponent}
        selectedOptions={filteredSelectedOptions}
        options={filteredOptions}
        search={search}
        isToShowCreatable={isToShowCreatable}
        isToLoadOptionsOnBottom={isToLoadOptionsOnBottom}
        isOpen={isOpen}
        placeholder={placeholder}
        isDisabled={isDisabled}
        searchInputWidth={searchInputWidth}
        adjustWidthOfSearchInput={adjustWidthOfSearchInput}
        onCreateOption={onCreateOption}
        onSearch={onSearch}
        onSelectOrRemoveOption={onSelectOrRemoveOption}
        onToggleOpen={onToggleOpen}
        />
    )
}