import { useEffect, useState, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { APP } from '../../../conf'
import RichTextBlockTextContent from '../RichText.Block.Text.Content'
import Layout from './layouts'

const DEFAULT_TEXT_SIZE = 12

export function TextToolbarComponent(props)


export default function RichTextBlockText(props) {
    const isActiveElement = props.block.uuid === props.activeBlockUUID

    const inputElementRef = useRef(null)
    const fullTextRef = useRef(retrieveFullText())
    const blockRef = useRef(props.block)
    const caretPositionRef = useRef({ start: 0, end: 0 })
    const previousCaretPositionRef = useRef(caretPositionRef.current)
    const isInCompositionRef = useRef(false)
    const isToPreventCallingSelectChangeTwiceRef = useRef(false)
    const isElementFocusedRef = useRef(isActiveElement)
    const textCharacterIndexesByContentUUIDRef = useRef(retrieveContentCharacterIndexesByContentUUID())

    /**
     * / * WEB ONLY * /
     * 
     * This is used to update the caretPositionRef so we can know where the caret is located
     * inside of the contentEditable container.
     */
    function webOnUpdateCaretPosition(start, end) {
        if (isInCompositionRef.current === false) {
            previousCaretPositionRef.current = {
                start: caretPositionRef.current.start,
                end: caretPositionRef.current.end
            }
            caretPositionRef.current = { start, end }
        }
    }


    function retrieveContentCharacterIndexesByContentUUID() {
        const textCharacterIndexesByContentUUID = []
        for (let contentIndex=0; contentIndex<props.block.contents.length; contentIndex++) {
            const content = props.block.contents[contentIndex]
            const contentUUID = content.uuid

            for (let contentTextIndex=0; contentTextIndex<content.text.length; contentTextIndex++) {
                textCharacterIndexesByContentUUID.push(contentUUID)
            }
        }
        return textCharacterIndexesByContentUUID
    }

    /**
     * This is used to update the fullTextRef with the new text of the hole text block.
     * The idea is that we can use this text to compare to the text that comes from the input
     * and see if they are the same lenght, equal, and do all types of comparison.
     * 
     * @param {string} fullText - The fulltext of the text block.
     */
    function updateFullText(fullText) {
        fullTextRef.current = fullText
    }

    /**
     * This is used to traverse through all of the contents of the block and retrieve exactly
     * the full text of the block.
     * 
     * @returns {string} - The full text of the block.
     */
    function retrieveFullText() {
        let fullText = ''
        for (const content of props.block.contents) {
            fullText += content.text
        }
        return fullText
    }

    /**
     * / * WEB ONLY * /
     * 
     * This is used to update the isElementFocusedRef so we can know if the element is focused or not.
     * 
     * @param {boolean} isElementFocused - The boolean value of if the element is focused or not.
     */
    function webOnUpdateElementFocused(isElementFocused=!isElementFocusedRef.current) {
        isElementFocusedRef.current = isElementFocused
    }

    /**
     * / * WEB ONLY * /
     * 
     * This function is supposed to update the status if a composition is in progress or not.
     * 
     * @param {boolean} [isInComposition=!isInCompositionRef.current] - The status of the composition.
     */
    function webOnUpdateIsInCompositionStatus(isInComposition=!isInCompositionRef.current) {
        isToPreventCallingSelectChangeTwiceRef.current = isInComposition === false
        isInCompositionRef.current = isInComposition
    }

    /**
     * / * WEB ONLY * /
     * 
     * This is used to retrieve the inner html contents of the contentEditable container. We prevent 
     */
    function webGetInnerHTML() {
        let innerHTML = ``
        if (APP === 'web') {
            blockRef.current.contents.forEach((content) => {
                const hasCustomMetadata = typeof content.customMetadata === 'object' &&
                    ![null, undefined].includes(content.customMetadata) &&
                    Object.keys(content.customMetadata) 
                const isBold = typeof content.isBold === 'boolean' && content.isBold === true
                const isItalic = typeof content.isItalic === 'boolean' && content.isItalic === true
                const isCode = typeof content.isCode === 'boolean' && content.isCode === true
                const isUnderline = typeof content.isUnderline === 'boolean' && 
                    content.isUnderline === true
                const isLink = typeof content.link === 'string' && content.link !== ''
                const hasMarkerColor = typeof content.markerColor === 'string' && 
                    content.markerColor !== ''
                const hasTextColor = typeof content.textColor === 'string' && 
                    content.textColor !== ''
                const hasSpecialSize = typeof content.textSize === 'number' && 
                    content.textSize !== DEFAULT_TEXT_SIZE
                const isNotASpecialContent = (hasCustomMetadata || hasMarkerColor ||
                    isBold || isItalic || isCode || isUnderline || isLink || hasTextColor ||
                    hasSpecialSize) === false

                if (isNotASpecialContent) {
                    innerHTML = `${innerHTML} ${content.text}`
                } else {
                    innerHTML = `${innerHTML} ${renderToString(
                        <RichTextBlockTextContent
                        key={content.uuid}
                        content={content}
                        />
                    )}`
                }
            })
        }
        return innerHTML
    }

    function onInputDelete(startPosition, endPosition) {

    }

    function webOnInput(insertedText) {
        const isNotInsideComposition = isInCompositionRef.current === false
        if (isNotInsideComposition) {
            const { end: endIndexPositionChanged } = caretPositionRef.current
            const { start: startIndexPositionChanged } = previousCaretPositionRef.current
            
            const didUserDeleteAnyTextWhileInserting = previousCaretPositionRef.current.start !== previousCaretPositionRef.current.end
            const didUserJustDeleteTheText = insertedText.length < fullTextRef.current.length
            
            if (didUserDeleteAnyTextWhileInserting)
            
            //console.log('webOnInput')
            //console.log(caretPositionRef.current)
            //console.log(previousCaretPositionRef.current)
            //console.log(startIndexPositionChanged)
            //console.log(previousCaretPositionRef.current)
            console.log(insertedText.substring(startIndexPositionChanged, endIndexPositionChanged))
            //console.dir(inputElementRef.current === document.activeElement)
            /*
            console.log(isInCompositionRef)
            console.log(caretPositionRef.current)
            console.log(insertedText)
            console.log(data)*/
            updateFullText(insertedText)
        }
    }

    /**
     * / * WEB ONLY * /
     * 
     * Why use this instead of the default `onSelect` event? Because `onSelect` is not triggered when
     * we select the hole text but the mouseup is fired outside of the contentEditable container.
     * Because of that using the `selectionchange` event is the best way to make the selection work.
     * 
     * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
     */
    function webOnSelectionChange() {
        const selectionData = document.getSelection()
        const isSelectedElementThisElement = selectionData.anchorNode.parentElement === inputElementRef.current
        if (isSelectedElementThisElement && isToPreventCallingSelectChangeTwiceRef.current === false) {
            console.log(selectionData)
            webOnUpdateCaretPosition(selectionData.focusOffset, selectionData.anchorOffset)
        }

        if (isToPreventCallingSelectChangeTwiceRef.current) isToPreventCallingSelectChangeTwiceRef.current = false
    }

    useEffect(() => {
        document.addEventListener('selectionchange', webOnSelectionChange)
        return () => {
            document.removeEventListener('selectionchange', webOnSelectionChange)
        }
    }, [])

    return (
        <Layout
        inputElementRef={inputElementRef}
        webOnInput={webOnInput}
        webOnUpdateCaretPosition={webOnUpdateCaretPosition}
        webOnUpdateElementFocused={webOnUpdateElementFocused}
        webOnUpdateIsInCompositionStatus={webOnUpdateIsInCompositionStatus}
        webGetInnerHTML={webGetInnerHTML}
        />
    )
}