import { APP } from '../../../../conf'
import styled from 'styled-components'
import { TouchableOpacity } from 'react-native'

export const Button = APP === 'web' ? 
styled.button`
    background-color: ${props => props.isSelected ? 
        ![undefined, null].includes(props.selectedBackgroundColor) ? props.selectedBackgroundColor : props.theme.green_REFLOW :
        ![undefined, null].includes(props.nonSelectedBackgroundColor) ? props.nonSelectedBackgroundColor : props.theme.clearGray};
    border: 0;
    border-radius: ${props => props.dotSize}px;
    padding: 0;
    width: ${props => (props.dotSize  * 2) + 4}px;
    padding: 2px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
`
:
styled(TouchableOpacity)``

export const Dot = APP === 'web' ? 
styled.div`
    width: ${props => props.dotSize}px;
    height: ${props => props.dotSize}px;
    border-radius: 50%;
    background-color: ${props => props.dotColor};
    transform: translateX(${props => props.isSelected ? '100%' : '0'});
    transition: transform 0.2s ease-in-out;
    box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
`
:
styled.View``