import { strings, Tooltip } from '../../../../core'
import Styled from '../styles'
import { faLink, faUnlink, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'

export default function RichTextBlockTextToolbarWebLayout(props) {
    return (
        <Styled.Container
        ref={props.toolbarRef}
        position={props.toolbarPosition}
        >   
            <Tooltip
            text={strings('richTextTextToolbarBoldTooltip')}
            placement={['top', 'bottom']}
            >
                <Styled.Button
                isSelected={props.toolbarParams.isBold}
                onMouseDown={(e) => {
                    e.preventDefault()
                    props.onUpdateToolbarState({isBold: !props.toolbarParams.isBold})
                }}
                >
                    B
                </Styled.Button>
            </Tooltip>
            <Tooltip
            text={strings('richTextTextToolbarItalicTooltip')}
            placement={['top', 'bottom']}
            >
                <Styled.Button
                isSelected={props.toolbarParams.isItalic} 
                isItalic={true}
                onMouseDown={(e) => {
                    e.preventDefault()
                    props.onUpdateToolbarState({isItalic: !props.toolbarParams.isItalic})
                }}
                >
                    <Styled.ItalicText>
                        I
                    </Styled.ItalicText>
                </Styled.Button>
            </Tooltip>
            <Tooltip
            text={strings('richTextTextToolbarUnderlineTooltip')}
            placement={['top', 'bottom']}
            >
                <Styled.Button
                isSelected={props.toolbarParams.isUnderline} 
                isUnderline={true}
                onMouseDown={(e) => {
                    e.preventDefault()
                    props.onUpdateToolbarState({isUnderline: !props.toolbarParams.isUnderline})
                }}
                >
                    <Styled.UnderlinedText>
                        U
                    </Styled.UnderlinedText>
                </Styled.Button>
            </Tooltip>
            <Styled.Divisor/>
            <Tooltip
            text={
                props.isLinkInputOpen === true ?
                strings('richTextTextToolbarApplyLinkTooltip') : 
                strings('richTextTextToolbarLinkTooltip')
            }
            placement={['top', 'bottom']}
            >
                <Styled.Button
                isSelected={typeof props.toolbarParams.link === 'string'}
                dontChangeBackground={props.isLinkInputOpen === false}
                onMouseDown={(e) => {
                    if (props.isLinkInputOpen) {
                        props.onToggleLinkInput(false)
                        props.onUpdateToolbarState({link: e.target.value })
                    } else {
                        e.preventDefault()
                        props.onToggleLinkInput(true)
                        props.onTogglePreventToUpdateCaretPositionOnSelectionChange(true)
                    }
                }}
                >
                    <Styled.Link 
                    isSelected={typeof props.toolbarParams.link === 'string'}
                    icon={props.isLinkInputOpen === true ? faCheck : faLink}
                    />
                </Styled.Button>
            </Tooltip>
            {props.isLinkInputOpen === true ? (
                <Styled.LinkInput
                type={'text'}
                value={typeof props.toolbarParams.link === 'string' ? props.toolbarParams.link : ''}
                onMouseDown={() => props.onToggleToPreventBlockFromBecomingInactive(true)}
                onChange={(e) => {
                    props.onUpdateToolbarState({link: e.target.value }, true)
                    props.onTogglePreventToUpdateCaretPositionOnSelectionChange(true)
                }}
                />
            ) : null}
            <Tooltip
            text={strings('richTextTextToolbarUnlinkTooltip')}
            placement={['top', 'bottom']}
            >
                <Styled.Button
                onMouseDown={(e) => {
                    e.preventDefault()
                    props.onUpdateToolbarState({link: null}, false)
                }}
                >
                    <Styled.Link 
                    icon={faUnlink}
                    />
                </Styled.Button>
            </Tooltip>
        </Styled.Container>
    )
}