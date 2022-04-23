import { APP } from '../../../../conf'
import styled from 'styled-components'
import { TextInput } from 'react-native'

export const TextContainer = APP === 'web' ? 
styled.div`
    display: inline-block;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 5px;
    width: 100%;
    outline: none !important;
`
:
styled(TextInput)``