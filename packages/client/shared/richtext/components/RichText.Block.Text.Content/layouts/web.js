import Styled from '../styles'

export default function RichTextBlockTextContentWebLayout(props) {
    return (
        <Styled.Span
        draggabble="false"
        isItalic={props.content.isItalic}
        isBold={props.content.isBold}
        isCode={props.content.text === '' || props.content.text === '\n' ? false : props.content.isCode}
        isUnderline={props.content.isUnderline}
        textColor={props.content.textColor}
        markerColor={props.content.markerColor}
        textSize={props.content.textSize}
        link={props.content.link}
        >
            {`${props.isLastContentAndLastCharacterIsANewLine ? props.content.text + '\n' : props.content.text}`}
        </Styled.Span>
    )
}