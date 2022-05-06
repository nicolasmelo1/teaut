import { useEffect, useState } from 'react'
import { APP } from '../../../conf'
import Layout from './layouts'

export default function RichTextBlockTextToolbar(props) {
    const [toolbarPosition, setToolbarPosition] = useState({x: 0, y: 0, wasCalculated: false})
    const [toolbarParams, setToolbarParams] = useState(props.initialToolbarParams)

    /**
     * This function will set the position of the toolbar in the text editor. This way it will be always in the same
     * place as the caret. This is a behaviour similar to notion's toolbar.
     * 
     * On notion the toolbar only shows when the user is selecting a text but here it will always be visible.
     */
    function retrieveCaretPositionInPixels() {
        function getCaretPositionInPixels() {
            if (APP === 'web') {
                const positionOfSelection = window.getSelection().getRangeAt(0).getBoundingClientRect()
                setToolbarPosition({ x: positionOfSelection.x, y: positionOfSelection.y, wasCalculated: true })
            } else setToolbarPosition({ x: 0, y: 0, wasCalculated: true })
        }
        setTimeout(() => getCaretPositionInPixels(), 0)
    }

    useEffect(() => {
        props.registerToolbarStateObserver(setToolbarParams)
        retrieveCaretPositionInPixels()
    }, [])
    
    return (
        <Layout
        onUpdateToolbarState={props.onUpdateToolbarState}
        toolbarPosition={toolbarPosition}
        toolbarParams={toolbarParams}
        />
    )
}