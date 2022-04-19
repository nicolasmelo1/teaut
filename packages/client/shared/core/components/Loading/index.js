import { useTheme } from 'styled-components'
import Layout from './layouts'

/** 
 * Load a a simple loading animation in the screen. 
 * The size os this component is not pre-defined and depends on the
 * size of the parent component for you to style. Just add it around a div
 * and give a width and a height for the div. This component will fill the hole
 * div.
 */
export default function Loading(props) {
    const theme = useTheme()
    const color = typeof props.color === 'string' ? props.color : theme.gray_REFLOW

    return (
        <Layout
        color={color}
        />
    )
}