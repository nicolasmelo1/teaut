import { Fragment, useState, useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { APP } from '../../../../conf'
import { webGetSelectionSelectCursorPosition } from '../utils'
import RichTextBlockTextContent from '../../RichText.Block.Text.Content'
import Styled from '../styles'

const DEFAULT_TEXT_SIZE = 12

function RichTextBlockTextToolbarWebLayout(props) {
    const [toolbarParams, setToolbarParams] = useState(props.initialToolbarParams)

    useEffect(() => {
        props.registerToolbarStateObserver(setToolbarParams)
    }, [])
    return (
        <div>
            <button
            style={{
                fontWeight: toolbarParams.isBold ? 'bold' : 'normal',
            }}
            onClick={() => props.onUpdateToolbarState({isBold: !toolbarParams.isBold})}
            >
                B
            </button>
        </div>
    )
}


/**
 * Since this component has too many web specific logic we can add the web specific logic inside of the layout itself.
 */
export default function RichTextBlockTextWebLayout(props) {
    /** 
     * This function is supposed to update the status if a composition is in progress or not.
     * 
     * @param {boolean} [isInComposition=!webIsInCompositionRef.current] - The status of the composition.
     */
     function onUpdateIsInCompositionStatus(isInComposition=!webIsInCompositionRef.current) {
        props.preventToUpdateCaretPositionOnSelectionChangeRef.current = isInComposition === false
        props.webIsInCompositionRef.current = isInComposition
    }

    /**
     * Why use this instead of the default `onSelect` event? Because `onSelect` is not triggered when
     * we select the hole text but the mouseup is fired outside of the contentEditable container.
     * Because of that using the `selectionchange` event is the best way to make the selection work.
     * 
     * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
     */
     function onSelectionChange() {
        const selectionData = document.getSelection()
        const isSelectedElementThisElement = props.inputElementRef.current.contains(selectionData.anchorNode)
        const canUpdatePosition = isSelectedElementThisElement && 
            props.preventToUpdateCaretPositionOnSelectionChangeRef.current === false &&
            props.webIsInCompositionRef.current === false
        const { start, end } = webGetSelectionSelectCursorPosition(props.inputElementRef.current)
        
        if (canUpdatePosition) {
            props.onUpdateCaretPosition(start, end)
        }
    }
    
    /**
     * This is used so we can update the contents of the block at EVERY type of the user. This way it makes
     * it A LOT easier for us to handle when the user selects to make the text bold, italic, underlined and
     * so on.
     * 
     * See that we prevent the caret position from moving on select when this function starts, and then we enable
     * it back when it ends. That's because after `inputElementRef.current.innerHTML = webGetInnerHTML()`
     * the caret will move back to the first character of the block. So this will mess up with our caret positions.
     * In order to prevent that we prevent activating the `webOnUpdateCaretPosition`
     */
     function updateDivWithoutUpdatingState() {
        props.preventToUpdateCaretPositionOnSelectionChangeRef.current = true
        const { start, end } = props.caretPositionRef.current
        props.inputElementRef.current.innerHTML = getInnerHTML()
        setCaretPosition(start, end)
        props.preventToUpdateCaretPositionOnSelectionChangeRef.current = false
    }

    /**
     * This is a function used to set the caret position of the input element. Why we need this? Because after we update the
     * innerHTML from the inputElement in `updateDivWithoutUpdatingState` the caret position comes to the first character.
     * By doing this we can keep the caret as it was before updating the innerHTML of the input.
     * 
     * References: https://stackoverflow.com/questions/6249095/how-to-set-the-caret-cursor-position-in-a-contenteditable-element-div
     * https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
     * https://developer.mozilla.org/en-US/docs/Web/API/Range/setEnd
     * https://developer.mozilla.org/en-US/docs/Web/API/Range/setStart
     * 
     * @param {number} start - The start index of where the caret should be placed. 
     * @param {number} end - The end index of where the caret should be placed.
     */
    function setCaretPosition(start, end) {
        let indexOffset = 0
        const selection = window.getSelection()
        const range = document.createRange()

        for (let node of props.inputElementRef.current.childNodes) {
            let text = ''
            const isNodeOfTypeText = node.nodeType === Node.TEXT_NODE
            const isNodeOfTypeElement = node.nodeType === Node.ELEMENT_NODE
            if (isNodeOfTypeText) {
                text = node.data
            } else if (isNodeOfTypeElement) {
                node = node.firstChild
                const isFirstChildNodeOfTypeText = node.nodeType === Node.TEXT_NODE
                if (isFirstChildNodeOfTypeText) {
                    text = node.data
                }
            }
            
            const startingIndexOfContent = indexOffset + 1
            const isNodeTheStartingPositionOfTheSelection = start <= indexOffset + text.length &&
                start >= startingIndexOfContent
            const isNodeTheEndingPositionOfTheSelection = end <= indexOffset + text.length && 
                end >= startingIndexOfContent
            if (isNodeTheStartingPositionOfTheSelection) {
                range.setStart(node, start - indexOffset)
            }
            if (isNodeTheEndingPositionOfTheSelection) {
                range.setStart(node, end - indexOffset)
            }
            indexOffset += text.length
        }

        selection.removeAllRanges()
        selection.addRange(range)
    }

    /**
     * This is used to retrieve the inner html contents of the contentEditable container. We prevent 
     */
     function getInnerHTML() {
        let innerHTML = ``
        if (APP === 'web') {
            for (const content of props.blockRef.current.contents) {
                const hasCustomMetadata = typeof content.customMetadata === 'object' &&
                    ![null, undefined].includes(content.customMetadata) &&
                    Object.keys(content.customMetadata).length > 0
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
                    innerHTML = `${innerHTML}${content.text}`
                } else {
                    innerHTML = `${innerHTML}${renderToString(
                        <RichTextBlockTextContent
                        key={content.uuid}
                        content={content}
                        />
                    )}`
                }
            }
        }
        return innerHTML
    }

    useEffect(() => {
        document.addEventListener('selectionchange', onSelectionChange)
        return () => {
            document.removeEventListener('selectionchange', onSelectionChange)
        }
    }, [])

    return (
        <Fragment>
            <Styled.TextContainer
            ref={props.inputElementRef}
            spellCheck={true}
            draggable={false}
            suppressContentEditableWarning={true}
            contentEditable={true}
            onCompositionStart={() => onUpdateIsInCompositionStatus(true)}
            onCompositionEnd={() => onUpdateIsInCompositionStatus(false)}
            onInput={(e) => {
                if (e.nativeEvent.inputType.includes('delete')) {
                    const { start, end } = webGetSelectionSelectCursorPosition(e.target)
                    props.onUpdateCaretPosition(start, end, true)
                }
                setTimeout(() => {
                    props.onInput(e.target.textContent)
                    updateDivWithoutUpdatingState()
                }, 0)
            }}
            dangerouslySetInnerHTML={{
                __html: getInnerHTML()
            }}
            />
            <RichTextBlockTextToolbarWebLayout
            registerToolbarStateObserver={props.registerToolbarStateObserver}
            initialToolbarParams={props.toolbarStateRef.current}
            onUpdateToolbarState={props.onUpdateToolbarState}
            />
        </Fragment>
    )
}