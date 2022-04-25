import { useState, useEffect } from 'react'
import Layout from './layouts'

export default function RichTextBlocks(props) {
    const [block, setBlock] = useState(props.block)

    /**
     * This will update the local state block and also we call the parent `onUpdateBlock` function
     * to update the hole blocks array.
     * 
     * @param {object} block - The block object data that was updated.
     */
    function onUpdateBlock(block) {
        setBlock(block)
        props.onUpdateBlock(block)
    }

    useEffect(() => {
        const isInternalStateBlockDifferentFromPropsBlock = 
            JSON.stringify(props.block) !== JSON.stringify(block)
        if (isInternalStateBlockDifferentFromPropsBlock) setBlock(props.block)
    }, [props.block])
    
    return (
        <Layout
        block={block}
        onUpdateBlock={onUpdateBlock}
        onRemoveBlock={props.onRemoveBlock}
        />
    )
}