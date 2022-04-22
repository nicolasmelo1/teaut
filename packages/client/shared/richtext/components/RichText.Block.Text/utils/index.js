import { APP } from '../../../../conf'

/**
 * / * WEB ONLY * /
 * 
 * On the browser we cannot get the selection position by default on a contentEditable element.
 * Because of this we need this function, this function is fired whenever we make a selection and it gives the
 * Start and the End position of the selection in the contentEditable. Suppose you have the following text in you contentEditable:
 * `i love cats` and we select the "LOVE" string the positions will be: 
 * {
 *      start: 2,
 *      end: 5
 * }
 * since index starts at 0.
 * 
 * We use this selection range to determine what has been deleted or what has been changed.
 * 
 * Reference: https://stackoverflow.com/a/4812022
 * 
 * @param {Element} element - The element object on which you get the selection position from, usually this will be the `inputRef.current`
 * 
 * @returns {Object} - An object with "start" and "end" keys that are both the start position of the selection cursor and the end position
 * of the selection cursor.
 */
export function webGetSelectionSelectCursorPosition(element) {
    if (APP === 'web') {
        let start = 0
        let end = 0
        let selection = null
        const document = element.ownerDocument || element.document
        const window = document.defaultView || document.parentWindow
        if (typeof window.getSelection != "undefined") {
            selection = window.getSelection()
            if (selection.rangeCount > 0) {
                const range = window.getSelection().getRangeAt(0)
                const preCaretRange = range.cloneRange()
                preCaretRange.selectNodeContents(element)
                preCaretRange.setEnd(range.startContainer, range.startOffset)
                start = preCaretRange.toString().length
                preCaretRange.setEnd(range.endContainer, range.endOffset)
                end = preCaretRange.toString().length
            }
        } else if ((selection = document.selection) && selection.type != "Control") {
            const textRange = selection.createRange()
            const preCaretTextRange = document.body.createTextRange()
            preCaretTextRange.moveToElementText(element)
            preCaretTextRange.setEndPoint("EndToStart", textRange)
            start = preCaretTextRange.text.length
            preCaretTextRange.setEndPoint("EndToEnd", textRange)
            end = preCaretTextRange.text.length
        }
        return { 
            start: start, 
            end: end 
        }
    }
}