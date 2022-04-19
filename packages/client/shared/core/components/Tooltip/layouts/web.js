import Styled from '../styles'

export default function TooltipWebLayout(props) {
    const isToLoadCustomText = props.customContent === null
    return (
        <div
        ref={props.containerRef}
        >
            {props.isOpen === true ? (
                <Styled.Container
                ref={props.tooltipRef}
                tooltipPosition={props.tooltipPosition}
                >
                    <Styled.ContainerWrapperTopAndBottomArrows>
                        {props.tooltipPosition.placement.includes('bottom') && props.isToShowArrows === true ? (
                            <Styled.ArrowUp
                            tooltipBackgroundColor={props.tooltipBackgroundColor}
                            />
                        ) : ''}
                        <Styled.ContainerWrapperLeftAndRightArrows>
                            {props.tooltipPosition.placement.includes('right') && props.isToShowArrows === true ? (
                                <Styled.ArrowLeft
                                tooltipBackgroundColor={props.tooltipBackgroundColor}
                                />
                            ) : ''}
                            {isToLoadCustomText ? (
                                <Styled.ContentContainer
                                tooltipBackgroundColor={props.tooltipBackgroundColor}
                                >
                                    <Styled.ContentText
                                    tooltipBackgroundColor={props.tooltipBackgroundColor}
                                    >
                                        {props.text}
                                    </Styled.ContentText>
                                </Styled.ContentContainer>
                            ) : props.customContent}
                            {props.tooltipPosition.placement.includes('left') && props.isToShowArrows === true ? (
                                <Styled.ArrowRight
                                tooltipBackgroundColor={props.tooltipBackgroundColor}
                                />
                            ) : ''}
                        </Styled.ContainerWrapperLeftAndRightArrows>
                        {props.tooltipPosition.placement.includes('top') && props.isToShowArrows === true ? (
                            <Styled.ArrowDown
                            tooltipBackgroundColor={props.tooltipBackgroundColor}
                            />
                        ) : ''}
                    </Styled.ContainerWrapperTopAndBottomArrows>
                </Styled.Container>
            ) : ''}
            {props.children}
        </div>
    )
}