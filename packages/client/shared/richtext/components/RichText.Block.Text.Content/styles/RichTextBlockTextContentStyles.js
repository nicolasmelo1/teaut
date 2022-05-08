import { APP } from '../../../../conf'
import styled from 'styled-components'
import { Text } from 'react-native'

const getTextColor = (props) => {
    const isLinkDefined = typeof props.link === 'string'
    if (isLinkDefined) {
        return props.theme.primaryBabyBlue
    } else if (props.textColor) {
        return props.textColor
    } else {
        return props.isCode ? 'red' : '#000'
    }
}
const getBackgroundColor = (props) => {
    if (props.markerColor) {
        return props.markerColor
    } else {
        return props.isCode ? '#f2f2f2' : 'transparent'
    }
}
const isBold = (props) => props.isBold ? 'bold': 'normal'
const isItalic = (props) => props.isItalic ? 'italic': 'normal'
const isUnderline = (props) => props.isUnderline ? `1px solid ${getTextColor(props)}` : 'none'

export const Span = APP === 'web' ?
styled(({
    isBold, textSize, isItalic, isUnderline, isCode, textColor, markerColor, link, ...rest
}) => {
    return (
        typeof link === 'string' ? 
        (   
            <a 
            target={'_blank'}
            href={link} 
            {...rest}>
                {rest.children}
            </a>
        ) : ( 
            <span {...rest}>
                {rest.children}
            </span>
        )
    )
})`
    white-space: pre-wrap;
    font-weight: ${props=> isBold(props)};
    font-style: ${props => isItalic(props)};
    border-bottom: ${props => isUnderline(props)};
    color: ${props => getTextColor(props)};
    background-color: ${props => getBackgroundColor(props)};
    padding: ${props=> props.isCode ? '0 3px': '0'};
    margin: ${props=> props.isCode ? '0 2px': '0'};
    border-radius: ${props=> props.isCode ? '3px' : '0'};
    font-size: ${props => ![null, '', undefined].includes(props.textSize) ? `${props.textSize}pt` : '12pt' };
    cursor: ${props => typeof props.link === 'string'  ? 'pointer' : 'auto'};
`
:
styled(Text)`
    font-weight: ${props=> isBold(props)};
    font-style: ${props => isItalic(props)};
    color: ${props => getTextColor(props)};
    textDecorationLine: ${props => props.isUnderline ? 'underline': 'none'};
    background-color: ${props => getBackgroundColor(props)};
    padding: ${props=> props.isCode ? '0 3px': '0'};
    margin: ${props=> props.isCode ? '0 2px': '0'};
    border-radius: ${props=> props.isCode ? '3px' : '0'};
    font-size: ${props => ![null, '', undefined].includes(props.textSize) ? `${props.textSize*1.2}px` : `${12*1.2}px` };
`