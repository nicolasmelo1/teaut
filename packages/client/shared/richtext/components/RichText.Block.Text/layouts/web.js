import { Fragment, useState, useEffect, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { APP } from '../../../../conf'
import { webGetSelectionSelectCursorPosition } from '../utils'
import { useKeyboardShortcuts } from '../../../../core'
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
    const hasUserInsertedATextAfterCompositionRef = useRef(true)
    const isInCompositionRef = useRef(false)
    const isUserPressingEnterRef = useRef(false)
    const isToPreventSelectionBeingCalledBecauseRerenderingRef = useRef(false)
    const cacheForWhenCompositionEndsRef = useRef(null)
    
    useKeyboardShortcuts({
        'ctrl + b': () => {
            if (props.isBlockActiveRef.current) onModifyAnyOfTheToolbarParams({isBold: !props.toolbarStateRef.current.isBold})
        },
    })
    
    /** 
     * This function is supposed to update the status if a composition is in progress or not.
     * 
     * @param {boolean} [isInComposition=!isInCompositionRef.current] - The status of the composition.
     */
     function onUpdateIsInCompositionStatus(isInComposition=!isInCompositionRef.current) {
        console.log('onUpdateIsInCompositionStatus')
        props.preventToUpdateCaretPositionOnSelectionChangeRef.current = isInComposition === false
        isInCompositionRef.current = isInComposition
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
        isToPreventSelectionBeingCalledBecauseRerenderingRef.current = true
        const { start, end } = props.caretPositionRef.current
        props.inputElementRef.current.innerHTML = getInnerHTML()
        setCaretPosition(start, end)
        isToPreventSelectionBeingCalledBecauseRerenderingRef.current = false
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
                range.setEnd(node, end - indexOffset)
            }
            indexOffset += text.length
        }

        selection.removeAllRanges()
        selection.addRange(range)
    }

    /**
     * This is the function that is called when the composition ends. The composition
     * usually is something from mac users.
     * 
     * The idea is that when the user types ˜ (tilde) we want to insert a tilde in the text that comes after it
     * so typing ˜ in the text input will underline this tilde, this means that if i type `a` for example
     * the ˜ will be merged with the 'a' and then the string will be ã.
     * 
     * So for example if i'm typing 'não' the process is:
     * 1 - Type 'n'. The string here will be 'n'
     * 2 - Type alt + n in the keyboard, this will start the composition. The string will be 'n˜'
     * 3 - Type 'a'. The string here will be 'nã'
     * 4 - Type 'o'. The string here will be 'não'
     * 
     * Do you see that in process 3 and 2 the characters are merged so they are in the same position on the string?
     * That's the hole idea.
     * 
     * `onCompositionEnd` will be called on process number 3.
     * 
     * But what if we do 'n˜' and do not type 'a'? Then 'onCompositionEnd' will be called on process number 2 and we will
     * insert the '˜' in the text. That's what 'hasUserInsertedATextAfterCompositionRef' is for.
     */
    function onCompositionEnd() {
        console.log('onCompositionEnd')

        onUpdateIsInCompositionStatus(false)
        if (hasUserInsertedATextAfterCompositionRef.current === false) {
            const { start, end } = webGetSelectionSelectCursorPosition(props.inputElementRef.current)
            props.onUpdateCaretPosition(start, end, true)
            props.onInput(props.inputElementRef.current.textContent)
            updateDivWithoutUpdatingState()

            hasUserInsertedATextAfterCompositionRef.current = true
        }
    }

    /**
     * This function is called when the user clicks on the toolbar. For example, when the user wants to make the text bold, italic
     * or underlined.
     * 
     * This wraps the `onUpdateToolbarState` props function so we don't do the hard work here, the only idea of this function is to
     * rerender the text input with the new state whenever the user modifies some param.
     * 
     * @param {object} toolbarState - The state of the toolbar, only set the options that the user clicks.
     * @param {boolean | undefined} [toolbarState.isBold=undefined] - If the text should be bold.
     * @param {number | undefined} [toolbarState.textSize=undefined] - If the text should be of a different size
     * than the normal text.
     * @param {boolean | undefined} [toolbarState.isItalic=undefined] - If the text should be italic.
     * @param {boolean | undefined} [toolbarState.isUnderline=undefined] - If the text should be underlined.
     * @param {boolean | undefined} [toolbarState.isCode=undefined] - If the text should be a styled code block.
     * @param {string | null | undefined} [toolbarState.latexEquation=undefined] - If the text should be a latex equation.
     * @param {string | null | undefined} [toolbarState.markerColor=undefined] - If the text should have a background color.
     * @param {string | null | undefined} [toolbarState.textColor=undefined] - If the text should have a text color.
     * @param {string | null | undefined} [toolbarState.link=undefined] - If the text should have a link.
     */
    function onModifyAnyOfTheToolbarParams(toolbarParamsState) {
        const hasUserSelectedAtLeastOneCharacter = props.caretPositionRef.current.start !== props.caretPositionRef.current.end
        props.onUpdateToolbarState(toolbarParamsState)
        if (hasUserSelectedAtLeastOneCharacter) updateDivWithoutUpdatingState()
    }

    /**
     * We try to do the leas    
     * Reference for all of the inputTypes: https://rawgit.com/w3c/input-events/v1/index.html#interface-InputEvent-Attributes
     * 
     * @param {import('react').SyntheticEvent<InputEvent>} e - The event that is triggered when the user types something.
     */
    function onInput(e) {
        const didSimplyHitEnter = e.nativeEvent.inputType === 'insertParagraph' && isUserPressingEnterRef.current === true
        const didHitEnterWithShift = e.nativeEvent.inputType === 'insertLineBreak'
        const didTheUserHitDeleteOrBackspace = e.nativeEvent.inputType.includes('delete')
        const hasUserInsertedSomeText = ![null, undefined, ''].includes(e.nativeEvent.data) && 
            didTheUserHitDeleteOrBackspace === false

        if (isInCompositionRef.current === false) {
            const { start, end } = webGetSelectionSelectCursorPosition(e.target)
            props.onUpdateCaretPosition(start, end)
        }
        
        const insertedText = didHitEnterWithShift ? '\n' : hasUserInsertedSomeText ? e.nativeEvent.data : null
        console.log('onInput')

        if (didSimplyHitEnter === false) {
            const isNotInComposition = isInCompositionRef.current === false
            if (isNotInComposition) {
                hasUserInsertedATextAfterCompositionRef.current = true
                props.onInput(e.target.textContent, insertedText)
                
                if (
                    didHitEnterWithShift === false && 
                    didTheUserHitDeleteOrBackspace === false
                ) {
                    updateDivWithoutUpdatingState()
                }
            } else {
                hasUserInsertedATextAfterCompositionRef.current = false
            }
        } else {
            e.preventDefault()
            updateDivWithoutUpdatingState()
        }

        if (isInCompositionRef.current === true) isInCompositionRef.current = false
    }
    /**
     * This is used to retrieve the inner html contents of the contentEditable container. We prevent 
     */
     function getInnerHTML() {
        let innerHTML = ``
        if (APP === 'web') {
            for (let i=0; i<props.blockRef.current.contents.length; i++) {
                const content = props.blockRef.current.contents[i]

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
                
                const isLastContent = i === props.blockRef.current.contents.length - 1
                const isLastContentAndLastCharacterIsANewLine = isLastContent && content.text.endsWith('\n')
                const isJustOneNewLine = (content.text.match(/\n$/g) || []).length === 1
                if (isNotASpecialContent) {
                    innerHTML = `${innerHTML}${isLastContentAndLastCharacterIsANewLine && isJustOneNewLine ? 
                        content.text + '\n' : 
                        content.text
                    }`
                } else {
                    innerHTML = `${innerHTML}${renderToString(
                        <RichTextBlockTextContent
                        key={content.uuid}
                        isLastContentAndLastCharacterIsANewLine={isLastContentAndLastCharacterIsANewLine}
                        content={content}
                        />
                    )}`
                }
            }
        }
        return innerHTML
    }

     /**
     * Why use this instead of the default `onSelect` event? Because `onSelect` is not triggered when
     * we select the hole text but the mouseup is fired outside of the contentEditable container.
     * Because of that using the `selectionchange` event is the best way to update the caret position
     * when the user selects something inside of the text.
     * 
     * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
     */
    function onSelectionChange() {
        const selectionData = document.getSelection()
        const isSelectedElementThisElement = props.inputElementRef.current.contains(selectionData.anchorNode)
        const canUpdatePosition = isSelectedElementThisElement && 
            props.preventToUpdateCaretPositionOnSelectionChangeRef.current === false &&
            isToPreventSelectionBeingCalledBecauseRerenderingRef.current === false &&
            isInCompositionRef.current === false
        const { start, end } = webGetSelectionSelectCursorPosition(props.inputElementRef.current)
        if (canUpdatePosition) {
            props.onUpdateCaretPosition(start, end)
        }
       props.preventToUpdateCaretPositionOnSelectionChangeRef.current = false
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
            onFocus={() => props.onFocus()}
            onBlur={() => props.onBlur()}
            onClick={() => onSelectionChange()}
            onCompositionStart={() => onUpdateIsInCompositionStatus(true)}
            onCompositionEnd={(e) => onCompositionEnd(e)}
            onKeyDown={(e) => {
                isUserPressingEnterRef.current = e.key === 'Enter'
                props.updateToPreventToolbarStateChangeWhenTyping(true)
            }}
            onKeyUp={(e) => {
                isUserPressingEnterRef.current = false
                props.updateToPreventToolbarStateChangeWhenTyping(false)
            }}
            onInput={(e) => onInput(e)}
            dangerouslySetInnerHTML={{
                __html: getInnerHTML()
            }}
            />
            <RichTextBlockTextToolbarWebLayout
            registerToolbarStateObserver={props.registerToolbarStateObserver}
            initialToolbarParams={props.toolbarStateRef.current}
            onUpdateToolbarState={onModifyAnyOfTheToolbarParams}
            />
        </Fragment>
    )
}