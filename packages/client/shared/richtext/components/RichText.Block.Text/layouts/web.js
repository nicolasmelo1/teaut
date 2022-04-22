import { webGetSelectionSelectCursorPosition } from '../utils'

export default function RichTextBlockTextWebLayout(props) {
    return (
        <div
        spellCheck={true}
        draggable={false}
        suppressContentEditableWarning={true}
        contentEditable={true}
        onSelect={(event) => {
            const { start, end } = webGetSelectionSelectCursorPosition(event.target)
            props.onUpdateCaretPosition(start, end)
        }}
        onInput={(e) => {
            console.log(e.nativeEvent.inputType)
            props.onChange(e.target.textContent)
        }}
        >
            {props.webGetInnerHTML()}
        </div>
    )
}