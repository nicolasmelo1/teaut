import { useRef, useEffect, useState } from 'react'
import { APP } from '../../../conf'
import Layout from './layouts'

export default function RichTextBlockTextToolbar(props) {
    const toolbarRef = useRef()
    const [toolbarPosition, setToolbarPosition] = useState({x: 0, y: 0, wasCalculated: false})
    const [toolbarParams, setToolbarParams] = useState(props.initialToolbarParams)

    function getCaretPositionInPixels() {
        if (APP === 'web') {
            const toolbarRect = toolbarRef.current.getBoundingClientRect()            
            const positionOfSelection = window.getSelection().getRangeAt(0).getBoundingClientRect()
            setToolbarPosition({ 
                x: positionOfSelection.x, 
                y: positionOfSelection.y - toolbarRect.height - 5, 
                wasCalculated: true 
            })
        } else setToolbarPosition({ x: 0, y: 0, wasCalculated: true })
    }

    /**
     * This function will set the position of the toolbar in the text editor. This way it will be always in the same
     * place as the caret. This is a behaviour similar to notion's toolbar.
     * 
     * On notion the toolbar only shows when the user is selecting a text but here it will always be visible.
     */
    function retrieveCaretPositionInPixelsInFirstPaint() {
        setTimeout(() => getCaretPositionInPixels(), 0)
    }

    /**
     * This function will set the position of the toolbar in the text editor.
     */
    function onSelectionChange() {
        getCaretPositionInPixels()
    }

    useEffect(() => {
        props.registerToolbarStateObserver(setToolbarParams)
        retrieveCaretPositionInPixelsInFirstPaint()

        document.addEventListener('selectionchange', onSelectionChange)
        return () => {
            document.removeEventListener('selectionchange', onSelectionChange)
        }
    }, [])
    
    return (
        <Layout
        toolbarRef={toolbarRef}
        onUpdateToolbarState={props.onUpdateToolbarState}
        toolbarPosition={toolbarPosition}
        toolbarParams={toolbarParams}
        />
    )
}