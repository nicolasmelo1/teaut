import { useState, useRef } from 'react'
import { generateUUID } from '../../../../../shared/utils'
import { useBlocks } from '../../hooks'
import Layout from './layouts'

export default function RichText(props) {
    const isEditable = typeof props.isEditable === 'boolean'
    
    const [richTextData, setRichTextData] = useState({
        uuid: generateUUID(),
        blocks: [
            {
                uuid: generateUUID(),
                blockTypeId: 1,
                order: 0,
                contents: [{
                    order: 0,
                    uuid: generateUUID(),
                    text: 'I ',
                    textSize: 12,
                    isBold: false,
                    isItalic: false,
                    isUnderline: false,
                    isCode: false,
                    customMetadata: {},
                    latexEquation: null,
                    markerColor: null,
                    textColor: null,
                    link: null
                },
                {
                    order: 1,
                    uuid: generateUUID(),
                    text: 'Love',
                    textSize: 12,
                    isBold: true,
                    isItalic: false,
                    isUnderline: false,
                    isCode: false,
                    customMetadata: {},
                    latexEquation: null,
                    markerColor: null,
                    textColor: null,
                    link: null
                }]
            },
            {
                uuid: generateUUID(),
                blockTypeId: 1,
                order: 1,
                contents: [{
                    order: 0,
                    uuid: generateUUID(),
                    text: 'Teste ',
                    textSize: 12,
                    isBold: false,
                    isItalic: false,
                    isUnderline: false,
                    isCode: false,
                    customMetadata: {},
                    latexEquation: null,
                    markerColor: null,
                    textColor: null,
                    link: null
                }]
            }
        ]
    })
    const [activeBlockUUID, setActiveBlockUUID] = useState(null)
    const [toolbarProps, setToolbarProps] = useState({})
    const toolbarComponent = useRef(null)

    const {
        onUpdateBlock,
        onAddBlock,
        onRemoveBlock
    } = useBlocks(richTextData.blocks, (blocks) => setRichTextData({...richTextData, blocks}))

    /**
     * This function is responsible for registering the custom toolbar component and props of this toolbar.
     * 
     * @param {import('react').Component} component - The component that will be rendered inside of the toolbar.
     * @param {object} toolbarProps - Those are the props for the component.
     */
    function registerToolbarComponentAndProps(component, toolbarProps) {
        setToolbarProps(toolbarProps)
        toolbarComponent.current = component
    }

    /**
     * This is responsible for activating a block inside of the application.
     * 
     * @param {string} [blockUUID=null] - The UUID of the block that will be activated.
     */
    function onToggleActiveBlock(blockUUID=null) {
        setActiveBlockUUID(blockUUID)
    }

    /**
     * This is responsible for retrieving the custom toolbar component.
     * 
     * @returns {null | import('axios').ReactElement} - The custom component that will be 
     * rendered inside of the toolbar.
     */
    function retrieveCustomToolbarComponent() {
        const isToolbarComponentDefined = ![null, undefined].includes(toolbarComponent.current)
        if (isToolbarComponentDefined) {
            const CustomToolbarComponent = toolbarComponent.current
            return <CustomToolbarComponent {...toolbarProps} />
        } else {
            return null
        }
    }

    return (
        <Layout
        isEditable={isEditable}
        richTextData={richTextData}
        activeBlockUUID={activeBlockUUID}
        onRemoveBlock={onRemoveBlock}
        onUpdateBlock={onUpdateBlock}
        onAddBlock={onAddBlock}
        onToggleActiveBlock={onToggleActiveBlock}
        retrieveCustomToolbarComponent={retrieveCustomToolbarComponent}
        registerToolbarComponentAndProps={registerToolbarComponentAndProps}
        />
    )
}