import { APP } from '../../../../conf'
import styled from 'styled-components'
import { whiteOrBlackColor } from '../../../utils'
import { View, Text } from 'react-native'

export const Container = APP === 'web' ?
styled.div`
    top: ${props => props.tooltipPosition.position.y}px;
    left: ${props => props.tooltipPosition.position.x}px;
    position: fixed;
    max-width: ${props => typeof props.tooltipPosition.maxWidth === 'number' ? props.tooltipPosition.maxWidth : window.innerWidth}px;
    max-height: ${props => typeof props.tooltipPosition.maxHeight === 'number' ? props.tooltipPosition.maxHeight : window.innerWidth}px;
    background-color: transparent;
    opacity: ${props => props.tooltipPosition.wasCalculated ? 1 : 0};
    overflow: auto;
    z-index: 1;
`
:
styled(View)``

export const ContainerWrapperTopAndBottomArrows = APP === 'web' ?
styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: transparent;
`
:
styled(View)``


export const ContainerWrapperLeftAndRightArrows = APP === 'web' ? 
styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    background-color: transparent;
`
:
styled(View)``

export const ContentContainer = APP === 'web' ?
styled.div`
    display: flex;
    background-color: ${props => props.tooltipBackgroundColor};
    color: ${props => props.theme.clearGray};
    padding: 10px;
    border-radius: 5px;
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
`
:
styled(View)``

export const ArrowUp = APP === 'web' ?
styled.div`
    width: 0; 
    height: 0; 
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid ${props => props.tooltipBackgroundColor};
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
`
:
styled(View)``

export const ArrowDown = APP === 'web' ?
styled.div`
    width: 0; 
    height: 0; 
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid ${props => props.tooltipBackgroundColor};
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
`
:
styled(View)``

export const ArrowRight = APP === 'web' ?
styled.div`
    width: 0; 
    height: 0; 
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 5px solid ${props => props.tooltipBackgroundColor};
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
`
:
styled(View)``

export const ArrowLeft = APP === 'web' ?
styled.div`
    width: 0; 
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-right: 5px solid ${props => props.tooltipBackgroundColor};
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
`
:
styled(View)``

export const ContentText = APP === 'web' ?
styled.small`
    user-select: none;
    margin: 0;
    color: ${props => whiteOrBlackColor(props.tooltipBackgroundColor) === 'black' ? props.theme.gray_REFLOW : props.theme.clearGray}
`
:
styled(Text)``