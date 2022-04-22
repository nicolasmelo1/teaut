import RichTextBlock from '../../RichText.Block'
import Styled from '../styles'

export default function RichTextWebLayout(props) {
    return (
        <Styled.Container>
            <Styled.Page>
                {props.richTextData.blocks.map(block => (
                    <RichTextBlock
                    key={block.uuid} 
                    block={block} 
                    onAddBlock={props.onAddBlock}
                    onRemoveBlock={props.onRemoveBlock}
                    onUpdateBlock={props.onUpdateBlock}
                    />
                ))}
            </Styled.Page>
        </Styled.Container>
    )
}