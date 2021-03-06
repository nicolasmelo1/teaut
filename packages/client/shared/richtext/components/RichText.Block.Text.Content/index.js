import Layout from './layouts'

export default function RichTextBlockTextContent(props) {
    return (
        <Layout
        isLastContentAndLastCharacterIsANewLine={props.isLastContentAndLastCharacterIsANewLine}
        content={props.content}
        />
    )
}