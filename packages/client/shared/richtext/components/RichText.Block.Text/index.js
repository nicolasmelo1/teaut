import { useRef } from 'react'
import { APP } from '../../../conf'
import { generateUUID } from '../../../../../shared/utils'
import Layout from './layouts'

const DEFAULT_TEXT_SIZE = 12

export default function RichTextBlockText(props) {
    const toolbarStateRef = useRef({
        isBold: false,
        textSize: DEFAULT_TEXT_SIZE, 
        isItalic: false, 
        isUnderline: false, 
        isCode: false, 
        latexEquation: null, 
        markerColor: null, 
        textColor: null, 
        link: null
    })
    const toolbarObserverRef = useRef(() => {})
    const inputElementRef = useRef(null)
    const fullTextRef = useRef(retrieveFullText())
    const blockRef = useRef(props.block)
    const caretPositionRef = useRef({ start: 0, end: 0 })
    const previousCaretPositionRef = useRef(caretPositionRef.current)
    const preventToUpdateCaretPositionOnSelectionChangeRef = useRef(false)
    const textCharacterIndexesByContentUUIDRef = useRef(retrieveContentCharacterIndexesByContentUUID())
    const isTypingSoPreventToUpdateToolbarStateBasedOnCaretPositionRef = useRef(false)

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
    
    /**
     * This is used to register the toolbarObserver, toolbarObserser is a function that will 
     * recieve the state of the toolbar. Since this is a stateless component, in order to display
     * the changes in the state inside the toolbar we need to change the state inside of the toolbar
     * component.
     * 
     * @param {(toolbarState: {
     *      isBold: boolean,
     *      textSize: number, 
     *      isItalic: boolean, 
     *      isUnderline: boolean, 
     *      isCode: boolean, 
     *      latexEquation: null | string, 
     *      markerColor: null | string, 
     *      textColor: null | string, 
     *      link: null | string
     * })=> void} toolbarObserver - The function that will be called when the toolbar state changes.
     */
    function registerToolbarStateObserver(toolbarObserver=()=>{}) {
        toolbarObserverRef.current = toolbarObserver
    }

    // TODO: TEMPORARY
    function onUpdateToolbarState({
        isBold=undefined, textSize=undefined, isItalic=undefined, isUnderline=undefined, isCode=undefined,
        latexEquation=undefined, markerColor=undefined, textColor=undefined, link=undefined
    }={}) {
        inputElementRef.current.focus()

        isBold = typeof isBold === 'boolean' ? isBold : toolbarStateRef.current.isBold
        textSize = typeof textSize === 'number' ? textSize : toolbarStateRef.current.textSize
        isItalic = typeof isItalic === 'boolean' ? isItalic : toolbarStateRef.current.isItalic
        isUnderline = typeof isUnderline === 'boolean' ? isUnderline : toolbarStateRef.current.isUnderline
        isCode = typeof isCode === 'boolean' ? isCode : toolbarStateRef.current.isCode
        latexEquation = typeof latexEquation === 'string' ? latexEquation : toolbarStateRef.current.latexEquation
        markerColor = typeof markerColor === 'string' ? markerColor : toolbarStateRef.current.markerColor
        textColor = typeof textColor === 'string' ? textColor : toolbarStateRef.current.textColor
        link = typeof link === 'string' ? link : toolbarStateRef.current.link

        toolbarStateRef.current = {
            isBold, textSize, isItalic, isUnderline, isCode, latexEquation, markerColor, textColor, link
        }
        
        const isToolbarObserverDefined = typeof toolbarObserverRef.current === 'function'
        if (isToolbarObserverDefined) {
            toolbarObserverRef.current(toolbarStateRef.current)
        }
        
        const hasUserSelectedAtLeastOneCharacter = caretPositionRef.current.start !== caretPositionRef.current.end
        if (hasUserSelectedAtLeastOneCharacter) {
            updateContentsAfterSelectingTextAndUpdatingToolbarState()
        }
    }

    /**
     * This is used to update the contents when the user selects the 
     */
    function updateContentsAfterSelectingTextAndUpdatingToolbarState() {
        let indexOffset = 0
        const { start, end } = caretPositionRef.current
        
        for (const content of blockRef.current.contents) {
            const isContentInStartPosition = (start <= indexOffset + content.text.length &&
                start >= indexOffset)
            const isContentAfterStartPosition = start <= indexOffset
            const isContentInOrAfterStartPosition = isContentInStartPosition || isContentAfterStartPosition

            if (isContentInOrAfterStartPosition) {
                const isContentInEndPosition = end <= indexOffset + content.text.length &&
                    end >= indexOffset
            
                const endIndexPositionOfContent = start - indexOffset
                const doesStartPositionIsAtContent = endIndexPositionOfContent >= 0

                const textToTheLeft = content.text.slice(0, doesStartPositionIsAtContent ? endIndexPositionOfContent : content.text.length)
                console.log('textToTheLeft', textToTheLeft)
                if (isContentInEndPosition) {
                    const textToTheRight = content.text.slice(end - indexOffset, content.text.length)
                    console.log('textToTheRight', textToTheRight)
                    break
                }
            }
            
            indexOffset += content.text.length
        }
    }


    function retrieveContentCharacterIndexesByContentUUID() {
        const textCharacterIndexesByContentUUID = []
        for (let contentIndex=0; contentIndex<props.block.contents.length; contentIndex++) {
            const content = props.block.contents[contentIndex]
            const contentUUID = content.uuid

            for (let contentTextIndex=0; contentTextIndex < content.text.length; contentTextIndex++) {
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

    function updateToPreventToolbarStateChangeWhenTyping(
        isTyping=!isTypingSoPreventToUpdateToolbarStateBasedOnCaretPositionRef.current
    ) {
        isTypingSoPreventToUpdateToolbarStateBasedOnCaretPositionRef.current = isTyping
        if (isTyping === false) updateToolbarStateBasedOnCaretPosition()
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
     * When the user selects a text inside of the text input or when he moves the caret using the arrow keys the
     * state of the toolbar should be updated based on this position of the caret.
     * 
     * So how does it work? It's simple, let's separate first with two use cases: A new selection and just the caret moving.
     * - Just the caret moving:
     *      -> We will get the content where the caret is placed at and update the toolbar state based on that single content.
     * - A new selection:
     *      -> We will get all of the contents that are inside of the selection then we merge the params together. For 
     * boolean values (eg.: isBold, isItalic), it's simple. If we have the following markdown text 'I **love** *coding*',
     * I is not bold nor italic
     * love is bold
     * and coding is not bold but is italic
     * 
     * If we select "odin" from "coding" we are selecting just the content of 'coding' word. This means that italic will be highlighed
     * in the toolbar, but not bold. So now suppose we select "ve co" from "love" and "coding", we are selecting the 
     * bold content and the italic content, but 'love' is not italic, nor 'coding' is bold. So both italic and bold WILL NOT
     * be highlighted in the toolbar.
     * 
     * So what if coding was bold? Then the bold would be highlighted in the toolbar but not the italic.
     * 
     * Notice that we have the `isTypingSoPreventToUpdateToolbarStateBasedOnCaretPositionRef.current === false` condition
     * on the first line of the function, the name of the variable speaks for itself, but the idea is, that, while typing
     * the `onUpdateCaretPosition` function will be called, so we need to prevent updating the toolbar while typing so everything
     * can function normally and well.
     */
    function updateToolbarStateBasedOnCaretPosition() {
        if (isTypingSoPreventToUpdateToolbarStateBasedOnCaretPositionRef.current === false) {
            let indexOffset = 0

            let isBold = toolbarStateRef.current.isBold
            let textSize = toolbarStateRef.current.textSize
            let isItalic = toolbarObserverRef.current.isItalic
            let isUnderline = toolbarStateRef.current.isUnderline
            let isCode = toolbarStateRef.current.isCode
            let latexEquation = toolbarStateRef.current.latexEquation
            let markerColor = toolbarStateRef.current.markerColor
            let textColor = toolbarStateRef.current.textColor
            let link = toolbarStateRef.current.link

            const { start, end } = caretPositionRef.current

            for (const content of blockRef.current.contents) {
                const isContentInStartPosition = (start <= indexOffset + content.text.length &&
                    start >= indexOffset)
                const isContentAfterStartPosition = start <= indexOffset
                const isContentInOrAfterStartPosition = isContentInStartPosition || isContentAfterStartPosition

                if (isContentInOrAfterStartPosition) {
                    if (isContentInStartPosition) {
                        isBold = content.isBold
                        textSize = content.textSize
                        isItalic = content.isItalic
                        isUnderline = content.isUnderline
                        isCode = content.isCode
                        latexEquation = content.latexEquation
                        markerColor = content.markerColor
                        textColor = content.textColor
                        link = content.link
                    } else {
                        isBold = content.isBold && isBold
                        textSize = content.textSize === textSize ? textSize : content.textSize
                        isItalic = content.isItalic && isItalic
                        isUnderline = content.isUnderline && isUnderline
                        isCode = content.isCode && isCode
                        latexEquation = content.latexEquation === latexEquation ? latexEquation : content.latexEquation
                        markerColor = content.markerColor === markerColor ? markerColor : content.markerColor
                        textColor = content.textColor === textColor ? textColor : content.textColor
                        link = content.link === link ? link : content.link
                    }

                    const isContentInEndPosition = (end <= indexOffset + content.text.length &&
                        end >= indexOffset)
                    if (isContentInEndPosition) {
                        // Update the toolbar state with the state of the caret position
                        toolbarStateRef.current = {
                            isBold, textSize, isItalic, isUnderline, isCode, latexEquation, markerColor, textColor, link
                        }
                        
                        const isToolbarObserverDefined = typeof toolbarObserverRef.current === 'function'
                        if (isToolbarObserverDefined) {
                            toolbarObserverRef.current(toolbarStateRef.current)
                        }                
                        break
                    }
                }
                indexOffset += content.text.length
            }
        }
    }

    /**
     * This is used to update the caretPositionRef so we can know where the caret is located
     * inside of the contentEditable container.
     */
    function onUpdateCaretPosition(start, end, preventToUpdateCaretPositionOnSelectionChange=false) {
        if (preventToUpdateCaretPositionOnSelectionChangeRef.current === false) {
            preventToUpdateCaretPositionOnSelectionChangeRef.current = preventToUpdateCaretPositionOnSelectionChange
            previousCaretPositionRef.current = {
                start: caretPositionRef.current.start,
                end: caretPositionRef.current.end
            }
            caretPositionRef.current = { start, end }
            updateToolbarStateBasedOnCaretPosition()
        }
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
            indexOffset += content.text.length

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

    /**
     * This is supposed to insert some text to the text contents. The idea is that we will loop 
     * trough all of the contents until we reach the content that the user started typing on.
     * 
     * There are two conditions here:
     * - The user modified the toolbarParams (so the new text is now bold, while the content was not):
     *    '-> When this happens we should create a new content and insert the new text to it while separating the
     *        original content in a left and right side.
     * - The user did not modify the toolbarParams:
     *    '-> We should just insert the new text to the original content in the start position of the selection.
     * 
     * IMPORTANT: It's important to understand that we just modify ONE, and ONLY ONE content. We cannot
     * modify a bold and a normal text all at once when the user is typing
     * 
     * @param {number} startIndex - The index of the start of the selection.
     * @param {string} text - The text that was inserted inside of the text editor.
     * 
     * @returns {boolean} - Returns true if the toolbarParams are different from the content where the text
     * is being inserted, false otherwise.
     */
    function userInsertedSomeText(startIndex, text) {
        let indexOffset = 0
        for (let i=0; i<blockRef.current.contents.length; i++) {
            const content = blockRef.current.contents[i]
            const isContentAffectedByInsertion = startIndex <= indexOffset + content.text.length &&
                startIndex >= indexOffset
        
            if (isContentAffectedByInsertion) {
                const startIndexToInsert = startIndex - indexOffset
                const hasTheContentParametersChanged = checkIfContentsHaveTheSameParameters(
                    content, toolbarStateRef.current
                ) === false
                if (hasTheContentParametersChanged) {
                    const contentTextToTheLeft = content.text.substring(0, startIndexToInsert)
                    const contentTextToTheRight = content.text.substring(startIndexToInsert, content.text.length)
                    const newContent = createNewContent({...toolbarStateRef.current, text: text})
                    const isContentToTheLeftEmpty = contentTextToTheLeft.length === 0
                    const isContentToTheRightEmpty = contentTextToTheRight.length === 0

                    let newContentIndex = i
                    if (isContentToTheLeftEmpty === false) {
                        newContentIndex = i + 1
                        const contentToTheLeft = createNewContent({...content, text: contentTextToTheLeft})
                        blockRef.current.contents.splice(i, 1, contentToTheLeft)
                        blockRef.current.contents.splice(newContentIndex, 0, newContent)
                    } else {
                        blockRef.current.contents.splice(newContentIndex, 1, newContent)
                    }
                    
                    if (isContentToTheRightEmpty === false) {
                        const contentToTheRight = createNewContent({...content, text: contentTextToTheRight})
                        blockRef.current.contents.splice(newContentIndex + 1, 0, contentToTheRight)
                    }
                } else {
                    content.text = content.text.substring(0, startIndexToInsert) + 
                        text + content.text.substring(startIndexToInsert, content.text.length)
                }
                // We always modify just one content no matter the size of the text inserted.
                return hasTheContentParametersChanged
            }
            indexOffset += content.text.length
        }
        return false
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
                let nextContent = blockRef.current.contents[i]
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
                    nextContent = newContent
                } else {
                    pushContentUUIDToTextCharacterIndexesByContentUUID(
                        currentContent.uuid, currentContent.text
                    )
                    currentContent.order = newContents.length
                    newContents.push(currentContent)
                }

                const isComparingLastContent = i === blockRef.current.contents.length - 1
                if (isComparingLastContent) {
                    pushContentUUIDToTextCharacterIndexesByContentUUID(
                        nextContent.uuid, nextContent.text
                    )
                    nextContent.order = newContents.length
                    newContents.push(nextContent)
                }

                currentContent = nextContent
            }
            blockRef.current.contents = newContents
            textCharacterIndexesByContentUUIDRef.current = textCharacterIndexesByContentUUID
        } else {
            textCharacterIndexesByContentUUIDRef.current = retrieveContentCharacterIndexesByContentUUID()
        }
    }

    /**
     * This will handle whenever some text is inserted into the contenteditable container. By default the 
     * content editable does not have onChange event, so we need to handle that using the onInput event callback.
     * 
     * @param {string} fullText - The hole text inside of the contenteditable container. We will use the caret positions
     * to know where the text was inserted.
     * @param {string} insertedText - The text that was inserted inside of the contenteditable or TextInput container.
     */
    function onInput(fullText, insertedText) {
        const { start: startIndexPositionChanged } = previousCaretPositionRef.current

        const didUserDeleteAnyTextFromSelection = previousCaretPositionRef.current.start !== previousCaretPositionRef.current.end
        const didUserJustDeleteTheText = fullText.length < fullTextRef.current.length

        if (didUserDeleteAnyTextFromSelection) {
            userDeletedSomeText(previousCaretPositionRef.current.start, previousCaretPositionRef.current.end)
        } else if (didUserJustDeleteTheText) {
            userDeletedSomeText(caretPositionRef.current.start, previousCaretPositionRef.current.end)
        }

        const didUserInsertAnyText = insertedText !== null

        if (didUserInsertAnyText) {
            userInsertedSomeText(startIndexPositionChanged, insertedText)
        }

        updateFullText(fullText)
        tryToMergeEqualContents()
    }

    return (
        <Layout
        inputElementRef={inputElementRef}
        toolbarStateRef={toolbarStateRef}
        blockRef={blockRef}
        preventToUpdateCaretPositionOnSelectionChangeRef={preventToUpdateCaretPositionOnSelectionChangeRef}
        caretPositionRef={caretPositionRef}
        registerToolbarStateObserver={registerToolbarStateObserver}
        updateToPreventToolbarStateChangeWhenTyping={updateToPreventToolbarStateChangeWhenTyping}
        onUpdateToolbarState={onUpdateToolbarState}
        onUpdateCaretPosition={onUpdateCaretPosition}
        onInput={onInput}
        />
    )
}