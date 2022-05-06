import Styled from '../styles'

export default function RichTextBlockTextToolbarWebLayout(props) {
    return (
        <Styled.Container
        ref={props.toolbarRef}
        position={props.toolbarPosition}
        >
            <Styled.Button
            isSelected={props.toolbarParams.isBold}
            onMouseDown={(e) => {
                e.preventDefault()
                props.onUpdateToolbarState({isBold: !props.toolbarParams.isBold})
            }}
            >
                B
            </Styled.Button>
            <Styled.Button
            isSelected={props.toolbarParams.isItalic} 
            onMouseDown={(e) => {
                e.preventDefault()
                props.onUpdateToolbarState({isItalic: !props.toolbarParams.isItalic})
            }}
            >
                I
            </Styled.Button>
            <Styled.Button
            isSelected={props.toolbarParams.isUnderline} 
            onMouseDown={(e) => {
                e.preventDefault()
                props.onUpdateToolbarState({isUnderline: !props.toolbarParams.isUnderline})
            }}
            >
                U
            </Styled.Button>
        </Styled.Container>
    )
}