import { APP } from '../../../../conf'
import styled from 'styled-components'
import { View } from 'react-native'

export const Container = APP === 'web' ?
styled.div`
    padding: 0 10px;
`
:
styled(View)``

export const Page = APP === 'web' ?
styled.div`
    border-radius: 5px;
    border: 1px solid #ccc;
    box-shadow: rgb(56 66 95 / 8%) 4px 4px 12px;
`
:
styled(View)``