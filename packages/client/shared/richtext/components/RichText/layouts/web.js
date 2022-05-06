import RichTextBlock from '../../RichText.Block'
import Styled from '../styles'

export default function RichTextWebLayout(props) {
    return (
        <Styled.Container>
            <Styled.Page>
                {props.richTextData.blocks.map((block, index) => (
                    <RichTextBlock
                    key={block.uuid} 
                    block={block} 
                    activeBlockUUID={props.activeBlockUUID}
                    retrieveBlocks={props.retrieveBlocks}
                    onAddBlock={(blockData) => props.onAddBlock(blockData, index)}
                    onRemoveBlock={props.onRemoveBlock}
                    onUpdateBlock={props.onUpdateBlock}
                    onToggleActiveBlock={props.onToggleActiveBlock}
                    />
                ))}
            </Styled.Page>
        </Styled.Container>
    )
}