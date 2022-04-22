import RichTextBlockText from '../../RichText.Block.Text'
import Styled from '../styles'

export default function RichTextBlockWebLayout(props) {
    return (
        <Styled.Container>
            <RichTextBlockText
            block={props.block}
            onUpdateBlock={props.onUpdateBlock}
            />
        </Styled.Container>
    )
}