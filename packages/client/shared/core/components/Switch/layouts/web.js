import Styled from '../styles'

export default function SwitchWebLayout(props) {
    return (
        <Styled.Button
        dotSize={props.dotSize}
        onClick={(e) => {
            e.stopPropagation()
            props.onSelect()
        }}
        isSelected={props.isSelected}
        selectedBackgroundColor={props.selectedBackgroundColor}
        nonSelectedBackgroundColor={props.nonSelectedBackgroundColor}
        >
            <Styled.Dot
            dotColor={props.dotColor}
            dotSize={props.dotSize}
            isSelected={props.isSelected}
            />
        </Styled.Button>
    )
}