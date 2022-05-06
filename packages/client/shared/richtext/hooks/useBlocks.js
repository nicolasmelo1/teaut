import { useEffect, useRef } from 'react'

/**
 * This is used to handle the blocks inside of the rich text. THis handles the creation,
 * update, and removal of a block from a given blocks array.
 * 
 * @param {Array<object>} blocks - This is an array continining a list of blocks. Each block
 * can be inside of a page but we can also handle a block within a block for deeply nested
 * blocks. (one block inside of the other)
 * @param {(blocks: blocks) => void} onChangeBlocks - Function to be called whenever the blocks 
 * change inside of the array.
 */
export default function useBlocks(blocks=[], onChangeBlocks=(blocks) => {}) {
    const blocksRef = useRef(blocks)
    const blocksOrderByUUIDCache = useRef({})

    /**
     * This is used to register the block order in the cache.
     * With this we don't need to run trough the list of blocks everytime, we cache it
     * in an object and it becomes a lot more performant.
     * 
     * @param {string} uuid - The uuid of the block to register the order to.
     * @param {number} order - The order of the block inside of the list of blocks
     */
    function registerBlockOrderByUUID(uuid, order) {
        blocksOrderByUUIDCache.current[uuid] = order
    }

    /**
     * This is used to retrieve the index of the block by it's uuid. 
     * We try to retrieve the index of the block by searching the cache.
     * If the index exists in the cache retrieve it directly, otherwise
     * find the index of the element in the list/array
     * 
     * @param {string} uuid - The uuid of the block to retrieve the index for.
     * 
     * @returns {number | null} - The index of the block or null if we doesn't find it.
     */
    function getBlockOrderByUUID(uuid) {
        let blockOrder = blocksOrderByUUIDCache.current[uuid]
        const doesBlockOrderExist = typeof blockOrder === 'number'

        if (doesBlockOrderExist) return blockOrder

        blockOrder = blocks.findIndex(block => block.uuid === uuid)
        const doesBlockExist = typeof blockOrder === 'number' && blockOrder !== -1
        
        if (doesBlockExist) {
            registerBlockOrderByUUID(uuid, blockOrder)
            return blockOrder
        } 
        return null
    }

    /**
     * This is used to update the block data. Whatever changed inside of the block,
     * this function will be called.
     */
    function onUpdateBlock(block) {
        const blockIndex = getBlockOrderByUUID(block.uuid)
        const doesBlockExists = typeof blockIndex === 'number'
        if (doesBlockExists) {
            const hasBlockOrderChanged = block.order !== blockIndex
            if (hasBlockOrderChanged) registerBlockOrderByUUID(block.uuid, block.order)

            blocksRef.current[blockIndex] = block
            onChangeBlocks(blocksRef.current)
        }
    }

    /**
     * This is a function that is used to add a new block inside of the blocks array.
     * 
     * @param {object} block - The data of the block that you want to add.
     * @param {number | null} indexToAdd - The index to add the block.
     */
    function onAddBlock(block, indexToAdd=null) {
        const isIndexToAddDefined = typeof indexToAdd === 'number'
        
        if (isIndexToAddDefined) {
            blocksRef.current.splice(indexToAdd+1, 0, block)
        } else {
            block.order = blocksRef.current.length
            blocksRef.current.push(block)
        }

        onChangeBlocks(blocksRef.current)
    }

    /**
     * This function is responsible for removing a block from the blocks array.
     * We remove the block by the uuid, but then we retrieve the order and remove by it.
     * 
     * @param {string} blockUUID - The uuid of the block to remove.
     */
    function onRemoveBlock(blockUUID) {
        const blockIndex = getBlockOrderByUUID(blockUUID)
        const isBlockIndexDefined = ![null, undefined].includes(blockIndex) && 
            typeof blockIndex === 'number'
        
        if (isBlockIndexDefined) {
            blocksRef.current.splice(blockIndex, 1)

            onChangeBlocks(blocksRef.current)
        }
    }

    /**
     * Retrieve all of the blocks when needed instead of passing it as props and triggering a rerender
     * unecessarily.
     * 
     * @returns {object} - Returns a list of all of the blocks in the current context (the text editor or another block)
     */
    function retrieveBlocks() {
        return blocksRef.current
    }

    /**
     * This will update the local blocks ref with the external blocks data.
     */
    useEffect(() => {
        const isBlocksDifferentFromRef = JSON.stringify(blocksRef.current) !== JSON.stringify(blocks)
        if (isBlocksDifferentFromRef) {
            blocksRef.current = blocks
        }
    }, [blocks])

    return {
        onUpdateBlock,
        onAddBlock,
        onRemoveBlock,
        retrieveBlocks
    }
}