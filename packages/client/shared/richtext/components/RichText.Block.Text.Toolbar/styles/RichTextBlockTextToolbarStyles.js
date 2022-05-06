import { APP } from '../../../../conf'
import styled from 'styled-components'
import { View, TouchableOpacity } from 'react-native'

export const Container = APP === 'web' ?     
styled.div`
    display: flex;
    flex-direction: row;
    position: fixed;
    top: ${props => props.position.y}px;
    left: ${props => props.position.x}px;
    background-color: ${props => props.theme.white};
    opacity: ${props => props.position.wasCalculated ? '1' : '0'};
    padding: 10px;
    border-radius: 5px;
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
    border: 1px solid ${props => props.theme.lightGray};
`
:
styled(View)``

export const Button = APP === 'web' ?
styled.button`
    font-weight: ${props => props.isSelected ? 'bold' : 'normal'};
    font-size: 15px;
    paddng: 5px;
    height: 30px;
    width: 30px;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    border-radius: 5px;
    
    &:hover {
        background-color: ${props => props.theme.lightGray};
    }
`
:
styled(TouchableOpacity)``