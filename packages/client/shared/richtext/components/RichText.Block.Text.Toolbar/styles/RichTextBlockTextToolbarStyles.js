import { forwardRef } from 'react'
import { APP } from '../../../../conf'
import styled from 'styled-components'
import { View, TouchableOpacity, Text } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { TextInput } from '../../RichText.Block.Text/styles/RichTextBlockTextStyles'

export const Container = APP === 'web' ?     
styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
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
    border: 0;
    cursor: pointer;
    border-radius: 5px;
    margin: 0 2px;
    color: ${props => props.isSelected ? props.theme.primaryPeach : props.theme.mediumGray};
    background-color: ${props => props.isSelected && props.dontChangeBackground !== false ? props.theme.lightGray : 'transparent'};
    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;

    &:hover {
        background-color: ${props => props.theme.secondaryPinkPastel};
    }
`
:
styled(TouchableOpacity)``

export const ItalicText = APP === 'web' ?
styled.span`
    font-style: italic;
`
:
styled(Text)``

export const UnderlinedText = APP === 'web' ? 
styled.span`
    text-decoration: underline;
`
:
styled(Text)``

export const Divisor = APP === 'web' ?
styled.div`
    height: 20px;
    width: 2px;
    margin: 0 2px;
    background-color: ${props => props.theme.lightGray};
`
:
styled(View)``

export const Link = styled((({isSelected, ...rest}) => (
    <FontAwesomeIcon {...rest}/>
)))`
    color: ${props => props.isSelected ? props.theme.primaryPeach : props.theme.mediumGray};
`

export const LinkInput = APP === 'web' ?
styled.input`
    border: 2px solid ${props => props.theme.lightGray};
    border-radius: 5px;
    padding: 5px;
    outline: none;

    &:focus {
        border: 2px solid ${props => props.theme.secondaryPinkPastel};
    }
` 
: 
styled(TextInput)``