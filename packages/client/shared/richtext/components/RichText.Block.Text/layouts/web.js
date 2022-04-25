import { Fragment } from 'react'
import { webGetSelectionSelectCursorPosition } from '../utils'
import Styled from '../styles'

export default function RichTextBlockTextWebLayout(props) {
    return (
        <Fragment>
            <Styled.TextContainer
            ref={props.inputElementRef}
            spellCheck={true}
            draggable={false}
            suppressContentEditableWarning={true}
            contentEditable={true}
            onCompositionStart={() => props.webOnUpdateIsInCompositionStatus(true)}
            onCompositionEnd={() => props.webOnUpdateIsInCompositionStatus(false)}
            onFocus={() => props.webOnUpdateElementFocused(true)}
            onBlur={() => props.webOnUpdateElementFocused(false)}
            onInput={(e) => {
                if (e.nativeEvent.inputType.includes('delete')) {
                    const { start, end } = webGetSelectionSelectCursorPosition(e.target)
                    props.webOnUpdateCaretPosition(start, end, true)
                }
                setTimeout(() => {
                    props.webOnInput(e.target.textContent)
                }, 0)
            }}
            dangerouslySetInnerHTML={{
                __html: props.webGetInnerHTML()
            }}
            />
            <div>
                <button
                onClick={() => props.updateToolbarState()}
                >B</button>
            </div>
        </Fragment>
    )
}