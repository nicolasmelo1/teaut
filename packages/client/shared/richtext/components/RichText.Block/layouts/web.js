import RichTextBlockText from '../../RichText.Block.Text'
import Styled from '../styles'

export default function RichTextBlockWebLayout(props) {
    return (
        <Styled.Container>
            <RichTextBlockText
            block={props.block}
            activeBlockUUID={props.activeBlockUUID}
            retrieveBlocks={props.retrieveBlocks}
            onAddBlock={props.onAddBlock}
            onUpdateBlock={props.onUpdateBlock}
            onRemoveBlock={props.onRemoveBlock}
            onToggleActiveBlock={props.onToggleActiveBlock}
            />
        </Styled.Container>
    )
}