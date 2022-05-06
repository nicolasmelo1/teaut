import Styled from '../styles'

export default function RichTextBlockTextToolbarWebLayout(props) {
    return (
        <Styled.Container
        position={props.toolbarPosition}
        >
            <button
            style={{
                fontWeight: props.toolbarParams.isBold ? 'bold' : 'normal',
            }}
            onMouseDown={(e) => {
                e.preventDefault()
                props.onUpdateToolbarState({isBold: !props.toolbarParams.isBold})
            }}
            >
                B
            </button>
        </Styled.Container>
    )
}