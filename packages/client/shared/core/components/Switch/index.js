import { useState, useEffect } from 'react'
import Layout from './layouts'

/**
 * This component is used to create a switch similar to iOS or Android. It is just a checkbox but it has a nicer look and feel to it.
 * On the mobile version this is just a component above the default `Switch` component.
 * 
 * @param {object} props - The props that this component recieves.
 * @param {boolean} [props.isSelected=undefined] - The boolean that determines if the switch is selected or not. This is optional since
 * this component also holds the state. Although this is optional it's recommended because without it the component will
 * not work for anything.
 * @param {function} [props.onSelect=undefined] - The function that is called when the switch is selected or deselected. When this happens
 * we update the state of the switch but also the state outside of the switch component. Similar to the isSelected prop this
 * is optional although it is recommended to use it.
 * @param {number} [props.dotSize=20] - The size of the dot that is shown on the switch. By default it is 20px.
 * @param {string} [props.dotColor='#fff'] - The color of the dot that is shown on the switch. By default it is white.
 * @param {string} [props.nonSelectedBackgroundColor=undefined] - The color of the background of the switch when it is not selected.
 * @param {string} [props.selectedBackgroundColor=undefined] - The color of the background of the switch when it is selected.
 * 
 * @returns {import('react').Component} - Returns a react component.
 */
export default function Switch(props) {
    const [isSelected, setIsSelected] = useState(![null, undefined].includes(props.isSelected) ? props.isSelected : false)
    const dotSize = props.dotSize || 20
    const dotColor = props.dotColor || '#fff'

    /**
     * This component holds the state of the switch inside of it. So if for some reason we want just to make tests to the switch
     * it can pretty much work on its own without needing any specific props.
     * 
     * So what this function does is just change if the switch is selected or not. We update the local state first and if defined
     * we update the parent state.
     */
    function onSelect() {
        setIsSelected(!isSelected)
        if (![null, undefined].includes(props.onSelect) && typeof props.onSelect === 'function') {
            props.onSelect(!isSelected)
        }
    }

    /**
     * Used for keeping the state of the switch in sync with the parent state if defined.
     */
    useEffect(() => {
        if (typeof props.isSelected === 'boolean' && props.isSelected !== isSelected) {
            setIsSelected(props.isSelected)
        }
    }, [props.isSelected])

    return (
        <Layout
        selectedBackgroundColor={props.selectedBackgroundColor}
        nonSelectedBackgroundColor={props.nonSelectedBackgroundColor}
        dotSize={dotSize}
        dotColor={dotColor}
        onSelect={onSelect}
        isSelected={isSelected}
        />
    )
}