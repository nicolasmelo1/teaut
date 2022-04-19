import styled from 'styled-components'
import { APP } from '../../../../conf'

export const Container = APP === 'web' ?
styled.div`
    margin: 0;
    text-align: center;
    display: inline-block;
    vertical-align: top;
`
:
styled(View)``