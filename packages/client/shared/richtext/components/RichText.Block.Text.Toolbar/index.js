import { useRef, useEffect, useState } from 'react'
import { APP } from '../../../conf'
import Layout from './layouts'

export default function RichTextBlockTextToolbar(props) {
    const toolbarRef = useRef()

    const [isLinkInputOpen, setIsLinkInputOpen] = useState(false)
    const [toolbarPosition, setToolbarPosition] = useState({x: 0, y: 0, wasCalculated: false})
    const [toolbarParams, setToolbarParams] = useState(props.initialToolbarParams)

    /**
     * / * WEB ONLY * /
     * 
     * Function used for retrieving the caret x and y positions in pixels so we can keep the toolbar placed correctly right above the caret.
     */
    function getCaretPositionInPixels() {
        if (APP === 'web') {
            const selection = document.getSelection()
            const doesAnchorNodeExists = selection?.anchorNode !== null
            const doesInputContainsSelectedSelection = doesAnchorNodeExists ? 
                props.inputElementRef.current.contains(selection.anchorNode.parentElement) : false
            const isToolbarRenderedInThePage = toolbarRef.current !== null
            if (doesInputContainsSelectedSelection && isToolbarRenderedInThePage) {
                const selection = window.getSelection()
                const toolbarRect = toolbarRef.current.getBoundingClientRect()         
                const positionOfSelection = selection.getRangeAt(0).getBoundingClientRect()
                let xPosition = positionOfSelection.x
                const hasPassedTheWidthOfTheScreen = toolbarRect.width + xPosition > document.body.clientWidth
                if (hasPassedTheWidthOfTheScreen) xPosition = xPosition - (toolbarRect.width + xPosition - document.body.clientWidth)
                setToolbarPosition({ 
                    x: xPosition, 
                    y: positionOfSelection.y - toolbarRect.height - 5, 
                    wasCalculated: true 
                })
            }
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

    function onToggleLinkInput(isOpen=!isLinkInputOpen) {
        setIsLinkInputOpen(isOpen)
    }

    useEffect(() => {
        props.registerToolbarStateObserver(setToolbarParams)
        retrieveCaretPositionInPixelsInFirstPaint()

        if (APP === 'web') document.addEventListener('selectionchange', onSelectionChange)
        return () => {
            if (APP === 'web') document.removeEventListener('selectionchange', onSelectionChange)
        }
    }, [])

    useEffect(() => {
        getCaretPositionInPixels()
    }, [isLinkInputOpen])

    return (
        <Layout
        toolbarRef={toolbarRef}
        onUpdateToolbarState={props.onUpdateToolbarState}
        onToggleToPreventBlockFromBecomingInactive={props.onToggleToPreventBlockFromBecomingInactive}
        onTogglePreventToUpdateCaretPositionOnSelectionChange={
            props.onTogglePreventToUpdateCaretPositionOnSelectionChange
        }
        isLinkInputOpen={isLinkInputOpen}
        onToggleLinkInput={onToggleLinkInput}
        toolbarPosition={toolbarPosition}
        toolbarParams={toolbarParams}
        />
    )
}