import { useEffect, useState, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { APP } from '../../../conf'
import { webGetSelectionSelectCursorPosition } from './utils'
import { generateUUID } from '../../../../../shared/utils'
import RichTextBlockTextContent from '../RichText.Block.Text.Content'
import Layout from './layouts'

const DEFAULT_TEXT_SIZE = 12


export default function RichTextBlockText(props) {
    const isActiveElement = props.block.uuid === props.activeBlockUUID

    const toolbarStateRef = useRef({
        isBold: false
    })
    const inputElementRef = useRef(null)
    const fullTextRef = useRef(retrieveFullText())
    const blockRef = useRef(props.block)
    const caretPositionRef = useRef({ start: 0, end: 0 })
    const previousCaretPositionRef = useRef(caretPositionRef.current)
    const isInCompositionRef = useRef(false)
    const isElementFocusedRef = useRef(isActiveElement)
    const preventToUpdateCaretPositionOnSelectionChangeRef = useRef(false)
    const textCharacterIndexesByContentUUIDRef = useRef(retrieveContentCharacterIndexesByContentUUID())

    /**
     * This is a factory function used for creating new contents, if you look at the parameters
     * all of the properties are optional, you modify it as needed.
     * 
     * @param {object} contentParams - The parameters for the content.
     * @param {number} [contentParams.order=0] - The ordering of the content inside of the text block.
     * @param {string} [contentParams.text=''] - The text that will live inside of this content.
     * @param {number} [contentParams.textSize=12] - The size of the text inside of the content.
     * @param {boolean} [contentParams.isBold=false] - If the text inside of the content is bold.
     * @param {boolean} [contentParams.isItalic=false] - If the text inside of the content is italic.
     * @param {boolean} [contentParams.isUnderline=false] - If the text inside of the content is underlined.
     * @param {boolean} [contentParams.isCode=false] - If the text inside of the content is a styled 
     * code block. (it's similar to when you put the content between `` in markdown).
     * @param {object | undefined} [contentParams.customMetadata=undefined] - The custom metadata that will 
     * live inside of this content. For example, if you want to mark someone inside of the text you will
     * probably do '@{name of the person}'. But this name of the person will probably change. So although
     * the content is written inside of the text, we will call an external callback (a function that lives
     * outside of the rich text) asking for the proper string that should be used when rendering the content.
     * @param {string|null} [contentParams.latexEquation=null] - This might be deprecated, but different
     * from Notion, we will be able to write later equations inside of the text itself.
     * @param {string|null} [contentParams.markerColor=null] - The background color of the content.
     * @param {string|null} [contentParams.textColor=null] - The color of the text inside of the content.
     * @param {string|null} [contentParams.link=null] - Does the text inside of the content have a link?
     * 
     * @returns {contentParams} - Returns an object with the content parameters that were passed in.
     */
    function createNewContent({
        order=0, text='',isBold=false, textSize=12, isItalic=false, isUnderline=false, isCode=false,
        customMetadata=undefined, latexEquation=null, markerColor=null, textColor=null,
        link=null
    }={}) {
        return {
            order,
            uuid: generateUUID(),
            text,
            textSize,
            isBold,
            isItalic,
            isUnderline,
            isCode,
            customMetadata,
            latexEquation,
            markerColor,
            textColor,
            link
        }
    }
    // TODO: TEMPORARY
    function updateToolbarState() {
        toolbarStateRef.current = {
            isBold: !toolbarStateRef.current.isBold
        }
        inputElementRef.current.focus()
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
     * This function is supposed to be used to check if two contents have the same parameters.
     * We can use this comparison for two things:
     * - Check if the toolbarStateRef are equal to the content we are inserting.
     * - Check if two contents are equal so we can merge them together.
     * 
     * @param {object} content1 - The parameters for the content.
     * @param {number} content1.textSize - The size of the text inside of the content.
     * @param {boolean} content1.isBold - If the text inside of the content is bold.
     * @param {boolean} content1.isItalic - If the text inside of the content is italic.
     * @param {boolean} content1.isUnderline - If the text inside of the content is underlined.
     * @param {boolean} content1.isCode - If the text inside of the content is a styled 
     * code block. (it's similar to when you put the content between `` in markdown).
     * @param {object | undefined} content1.customMetadata - The custom metadata that will 
     * live inside of this content. For example, if you want to mark someone inside of the text you will
     * probably do '@{name of the person}'. But this name of the person will probably change. So although
     * the content is written inside of the text, we will call an external callback (a function that lives
     * outside of the rich text) asking for the proper string that should be used when rendering the content.
     * @param {string|null} content1.latexEquation - This might be deprecated, but different
     * from Notion, we will be able to write later equations inside of the text itself.
     * @param {string|null} content1.markerColor - The background color of the content.
     * @param {string|null} content1.textColor - The color of the text inside of the content.
     * @param {string|null} content1.link - Does the text inside of the content have a link?
     * @param {content1} content2 - The parameters for the content.
     */
    function checkIfContentsHaveTheSameParameters(content1, content2) {
        return content1?.textSize === content2?.textSize &&
            content1?.isBold === content2?.isBold &&
            content1?.isItalic === content2?.isItalic &&
            content1?.isUnderline === content2?.isUnderline &&
            content1?.isCode === content2?.isCode &&
            JSON.stringify(content1?.customMetadata) === JSON.stringify(content2?.customMetadata) &&
            content1?.latexEquation === content2?.latexEquation &&
            content1?.markerColor === content2?.markerColor &&
            content1?.textColor === content2?.textColor &&
            content1?.link === content2?.link
    }

    /**
     * / * WEB ONLY * /
     * 
     * This is used to update the caretPositionRef so we can know where the caret is located
     * inside of the contentEditable container.
     */
     function webOnUpdateCaretPosition(start, end, preventToUpdateCaretPositionOnSelectionChange=false) {
        preventToUpdateCaretPositionOnSelectionChangeRef.current = preventToUpdateCaretPositionOnSelectionChange
        if (isInCompositionRef.current === false) {
            previousCaretPositionRef.current = {
                start: caretPositionRef.current.start,
                end: caretPositionRef.current.end
            }
            caretPositionRef.current = { start, end }
        }
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
        preventToUpdateCaretPositionOnSelectionChangeRef.current = isInComposition === false
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
            for (const content of blockRef.current.contents) {
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

    /**
     * This function will handle when the user deleted any text from the text editor.
     * In order to fully work we need the start index of the text that was deleted and the
     * end index.
     * 
     * How do we delete the text? It's simple: 
     * - First we loop through all of the contents until we reach the endIndex. We modify the text
     * of each of the affected contents that was affected by the delete behaviour. If the content
     * ends up being a blank string we MARK to remove (We don't remove in a loop, since it can cause
     * issues)
     * - Then we remove the contents that were marked to remove using the `.filter()` method.
     * - Finally we update the `textCharacterIndexesByContentUUIDRef` without the deleted positions of
     * the text.
     * 
     * @param {number} startIndex - The start index of the text that was deleted. This should be a number
     * lower than `endIndex`
     * @param {number} endIndex - The end index of the text that was deleted. This should be a number
     * higher than `startIndex`
     */
    function userDeletedSomeText(startIndex, endIndex) {
        let indexOffset = 0
        const markedContentUUIDsToBeRemoved = [] 
        const contentUUIDsToRemoveTextFrom = [...new Set(textCharacterIndexesByContentUUIDRef.current.slice(startIndex, endIndex))]
        console.log(textCharacterIndexesByContentUUIDRef)
        console.log(contentUUIDsToRemoveTextFrom)
        for (const content of blockRef.current.contents) {
            const isContentAffectedByDeletion = contentUUIDsToRemoveTextFrom.includes(content.uuid)

            if (isContentAffectedByDeletion) {
                const deletionDidNotStartOnThisContent = startIndex - indexOffset < 0
                const deletionDidNotEndOnThisContent = endIndex > content.text.length + indexOffset
                const startIndexToRemove = deletionDidNotStartOnThisContent ? 
                    0 : startIndex - indexOffset
                const endIndexToRemove = deletionDidNotEndOnThisContent ? 
                    content.text.length : endIndex - indexOffset
                content.text = content.text.substring(0, startIndexToRemove) + 
                    content.text.substring(endIndexToRemove, content.text.length)
                
                const isContentEmptyToMarkForRemoval = content.text.length === 0
                if (isContentEmptyToMarkForRemoval) {
                    markedContentUUIDsToBeRemoved.push(content.uuid)
                }
            }
            indexOffset =+ content.text.length

            const hasPassedThroughAllOfTheContentsWhereTheDeleteAffected = indexOffset >= endIndex
            if (hasPassedThroughAllOfTheContentsWhereTheDeleteAffected) break
        }

        const hasMarkedContentsForRemoval = markedContentUUIDsToBeRemoved.length > 0
        if (hasMarkedContentsForRemoval) {
            blockRef.current.contents = blockRef.current.contents.filter(content => 
                markedContentUUIDsToBeRemoved.includes(content.uuid) === false
            )
        }
        const hasNoContentInBlock = blockRef.current.contents.length === 0
        if (hasNoContentInBlock) {
            blockRef.current.contents.push(createNewContent())
        }
        
        textCharacterIndexesByContentUUIDRef.current = [
            ...textCharacterIndexesByContentUUIDRef.current.slice(0, startIndex),
            ...textCharacterIndexesByContentUUIDRef.current.slice(
                endIndex, textCharacterIndexesByContentUUIDRef.current.length
            )
        ]
    }

    function userInsertedSomeText(startIndex, text) {
        let indexOffset = 0
        for (const content of blockRef.current.contents) {
            const isContentAffectedByInsertion = startIndex <= indexOffset + content.text.length &&
                startIndex >= indexOffset
            if (isContentAffectedByInsertion) {
                const startIndexToInsert = startIndex - indexOffset
                content.text = content.text.substring(0, startIndexToInsert) + 
                    text + content.text.substring(startIndexToInsert, content.text.length)
                // We always modify just one content no matter the size of the text inserted.
                break
            }
            indexOffset =+ content.text.length
        }
    }

    /**
     * Function responsible for trying to merge equal contents together. Why do this? To prevent multiple
     * little contents separated we render everything from one content. With this we can create contents
     * freely on the deletion or insertion process but here we will make sure everything is coupled together
     * with one another.
     * 
     * Okay, so how do we merge contents together? We loop through all of the contents of the block
     * by getting the currentContent and then the nextContent. The current token is the merged content
     * OR the nextToken.
     * 
     * After all that we update the contents array of the block with the `newContents` array.
     * 
     * IMPORTANT: This function also updates the `textCharacterIndexesByContentUUIDRef` array with the contentUUID
     * for each character of the hole block.
     */
    function tryToMergeEqualContents() {
        const textCharacterIndexesByContentUUID = []
        const hasSufficientContentsToBeMerged = blockRef.current.contents.length > 1
        function pushContentUUIDToTextCharacterIndexesByContentUUID(contentUUID, text) {
            for (let i=0; i<text.length; i++) {
                textCharacterIndexesByContentUUID.push(contentUUID)
            }
        }

        if (hasSufficientContentsToBeMerged) {
            const newContents = []
            let currentContent = blockRef.current.contents[0]
            for (let i=1; i<blockRef.current.contents.length; i++) {
                const nextContent = blockRef.current.contents[i]
                const doesContentsHaveEqualParameters = checkIfContentsHaveTheSameParameters(
                    currentContent, nextContent
                )
                if (doesContentsHaveEqualParameters) {
                    const newContent = createNewContent({
                        order: newContents.length,
                        text: currentContent.text + nextContent.text,
                        isBold: currentContent.isBold,
                        isItalic: currentContent.isItalic,
                        isCode: currentContent.isCode,
                        isUnderline: currentContent.isUnderline,
                        link: currentContent.link,
                        markerColor: currentContent.markerColor,
                        textColor: currentContent.textColor,
                        textSize: currentContent.textSize,
                    })
                    pushContentUUIDToTextCharacterIndexesByContentUUID(
                        newContent.uuid, newContent.text
                    )
                    newContents.push(newContent)
                    currentContent = newContent
                } else {
                    textCharacterIndexesByContentUUID.push(currentContent.uuid)
                    currentContent.order = newContents.length
                    newContents.push(currentContent)

                    const isComparingLastContent = i === blockRef.current.contents.length - 1
                    if (isComparingLastContent) {
                        textCharacterIndexesByContentUUID.push(nextContent.uuid)
                        nextContent.order = newContents.length
                        newContents.push(nextContent)
                    }

                    currentContent = nextContent
                }
            }
            blockRef.current.contents = newContents
            textCharacterIndexesByContentUUIDRef.current = textCharacterIndexesByContentUUID
        } else {
            textCharacterIndexesByContentUUIDRef.current = retrieveContentCharacterIndexesByContentUUID()
        }
    }

    function webUpdateDivWithoutUpdatingState() {
        preventToUpdateCaretPositionOnSelectionChangeRef.current = true
        const { start, end } = caretPositionRef.current
        inputElementRef.current.innerHTML = webGetInnerHTML()
        webSetCaretPosition(start, end)
        preventToUpdateCaretPositionOnSelectionChangeRef.current = false
    }

    /**
     * References: https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
     * 
     * @param {*} start 
     * @param {*} end 
     */
    function webSetCaretPosition(start, end) {
        let indexOffset = 0
        const selection = window.getSelection()
        const range = document.createRange()

        for (let node of inputElementRef.current.childNodes) {
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

    function webOnInput(insertedText) {
        const isNotInsideComposition = isInCompositionRef.current === false
        if (isNotInsideComposition) {
            const { end: endIndexPositionChanged } = caretPositionRef.current
            const { start: startIndexPositionChanged } = previousCaretPositionRef.current
    
            const didUserDeleteAnyTextFromSelection = previousCaretPositionRef.current.start !== previousCaretPositionRef.current.end
            const didUserJustDeleteTheText = insertedText.length < fullTextRef.current.length
            
            if (didUserDeleteAnyTextFromSelection) {
                userDeletedSomeText(previousCaretPositionRef.current.start, previousCaretPositionRef.current.end)
            } else if (didUserJustDeleteTheText) {
                userDeletedSomeText(caretPositionRef.current.start, previousCaretPositionRef.current.end)
            }

            // We know that the user has inserted some text on two conditions: 
            // - He selected the text and then inserted some text
            //      '-> On This case the start index of the previousCaretPosition should
            //          be different than the start index of the caretPosition
            // - He inserted some text without selecting anything from the text.
            //      '-> We know that the user has inserted some text when the current
            //          start inted caret position is bigger than the previous caret 
            //          position start index
            const didUserInsertAnyText = (didUserDeleteAnyTextFromSelection && 
                previousCaretPositionRef.current.start !== caretPositionRef.current.start) || 
                (caretPositionRef.current.start > previousCaretPositionRef.current.start)
            
            if (didUserInsertAnyText) {
                const insertedCharacter = insertedText.substring(startIndexPositionChanged, endIndexPositionChanged)
                userInsertedSomeText(startIndexPositionChanged, insertedCharacter)
            }

            updateFullText(insertedText)
        }
        webUpdateDivWithoutUpdatingState()
        tryToMergeEqualContents()        
        preventToUpdateCaretPositionOnSelectionChangeRef.current = false
        
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
        const isSelectedElementThisElement = inputElementRef.current.contains(selectionData.anchorNode)
        const canUpdatePosition = isSelectedElementThisElement && 
            preventToUpdateCaretPositionOnSelectionChangeRef.current === false

        if (canUpdatePosition) {
            const { start, end } = webGetSelectionSelectCursorPosition(inputElementRef.current)
            webOnUpdateCaretPosition(start, end)
        }
    }

    useEffect(() => {
        if (APP === 'web') document.addEventListener('selectionchange', webOnSelectionChange)
        return () => {
            if (APP === 'web') document.removeEventListener('selectionchange', webOnSelectionChange)
        }
    }, [])
    return (
        <Layout
        inputElementRef={inputElementRef}
        updateToolbarState={updateToolbarState}
        webOnInput={webOnInput}
        webOnUpdateCaretPosition={webOnUpdateCaretPosition}
        webOnUpdateElementFocused={webOnUpdateElementFocused}
        webOnUpdateIsInCompositionStatus={webOnUpdateIsInCompositionStatus}
        webGetInnerHTML={webGetInnerHTML}
        />
    )
}