import { APP } from '../../../../conf'
import styled from 'styled-components'
import { View } from 'react-native'

export const Container = APP === 'web' ?     
styled.div`
    display: flex;
    flex-direction: row;
    position: fixed;
    top: ${props => props.position.y}px;
    left: ${props => props.position.x}px;
`
:
styled(View)``