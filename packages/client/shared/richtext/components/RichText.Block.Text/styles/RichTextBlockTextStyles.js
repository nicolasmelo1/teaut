import { APP } from '../../../../conf'
import styled from 'styled-components'
import { View, TextInput as RNTextInput } from 'react-native'

export const TextContainer = APP === 'web' ?
styled.div`
    display: flex;
    flex-direction: row;
    position: relative;
`
:
styled(View)``

export const TextInput = APP === 'web' ? 
styled.div`
    display: inline-block;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: ${props => props.defaultTextSize}pt;
    padding: 5px;
    width: 100%;
    outline: none !important;
`
:
styled(RNTextInput)``