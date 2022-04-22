import { useState, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { APP } from '../../../conf'
import Layout from './layouts'

const DEFAULT_TEXT_SIZE = 12

export default function RichTextBlockText(props) {  
    const blockRef = useRef(props.block)
    const caretPositionRef = useRef({ start: 0, end: 0 })
    const previousCaretPositionRef = useRef({ start: 0, end: 0 })

    /**
     * This is used to update the caretPositionRef so we can know where the caret is located
     * inside of the contentEditable container.
     * 
     * @param {number} start - The start index position of the cursor/selection
     * @param {number} end - The end index position of the cursor/selection
     */
    function onUpdateCaretPosition(start, end) {
        previousCaretPositionRef.current = {
            start: caretPositionRef.current.start,
            end: caretPositionRef.current.end
        }
        caretPositionRef.current = { start, end }
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
                const isNotASpecialContent = (hasCustomMetadata && hasMarkerColor &&
                    isBold && isItalic && isCode && isUnderline && isLink && hasTextColor &&
                    hasSpecialSize) === false
                
                if (isNotASpecialContent) {
                    innerHTML = `${innerHTML} ${content.text}`
                } else {
                    innerHTML = `${innerHTML} ${renderToString(
                        <span
                        key={content.uuid}
                        >
                            {content.text}
                        </span>
                    )}`
                }
            })
        }
        return innerHTML
    }

    function webOnInput(text, isBold) {
        console.log('was inserted')
        console.log(previousCaretPositionRef.current.start, caretPositionRef.current.end)
        console.log(text.substring(
            previousCaretPositionRef.current.start, caretPositionRef.current.end)
        )
    }

    return (
        <Layout
        onChange={onChange}
        onUpdateCaretPosition={onUpdateCaretPosition}
        webGetInnerHTML={webGetInnerHTML}
        />
    )
}