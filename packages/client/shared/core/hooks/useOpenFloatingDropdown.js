import { useState, useRef, useEffect } from 'react'
import { APP } from '../../conf'

/**
 * This is a hook supposed to be used when you want a floating dropdown to appear on the screen.
 * A floating dropdown is a dropdown that isn't absolute positioned but fixed positioned. This means
 * that when we open it we need to calculate the position on the screen.
 * 
 * @param {object} useOpenFloatingDropdownOptions - The options to configure this hook on first render.
 * @param {boolean} [useOpenFloatingDropdownOptions.isOpen=false] - The initial state of the dropdown, is it open or closed?
 * @param {boolean} [useOpenFloatingDropdownOptions.isCentered=false] - Should the dropdown be vertically centered or not?
 * @param {{
 *      position: { x: number, y: number},
 *      maxHeight: null | number,
 *      wasCalculated: boolean
 * }} [useOpenFloatingDropdownOptions.menuPosition] - The position of the dropdown menu, since it is fixed positioned.
 */
export default function useOpenFloatingDropdown({
    isOpen=false, 
    isCentered=false,
    menuPosition={
        position: {x: 0, y:0},
        maxHeight: null,
        wasCalculated: false
    }
}={}) {
    const dropdownButtonRef = useRef()
    const dropdownMenuRef = useRef()
    const [isDropdownOpen, setIsDropdownOpen] = useState(isOpen)
    const [dropdownMenuPosition, setDropdownMenuPosition] = useState(menuPosition)

    /**
     * / * WEB ONLY * /
     * 
     * This does a bunch of calculations to determine two things: 
     * - First we define if the dropdown menu should be shown at the top or at the bottom of the button.
     * By default we always open the dropdown at the bottom, but if the dropdown menu is too big to fit on the screen
     * we will see if we can fit it at the top. (imagine we are opening the dropdown on the last field of the formulary)
     * - Second we set the maximum height of the dropdown menu. This way we will make it overflow if it is too big.
     * 
     * Okay, so how we do the calculations:
     * First we get the DOMRect data of the hole formulary container (we need it since the formulary container can overflow)
     * Then we get the DOMRect data of the field edit button menu 
     * 
     * After that we will calculate the space from the top of the screen to the bottom. And for that what we do is:
     * The height of the window minus the place where the element is located. If the dropdown is at the bottom this means
     * that the top portion will be the exact place where the element is located, if the element is located on the top, then this
     * means that what we want is the bottom position.
     * 
     * WHAT?
     * 
     * |---------------------------------|
     * |                              ...|
     * |                       |---------|| -> When we do `fieldEditDropdownRect.top` this is what we get, the exact top
     * |-----------------------|---------||
     *                         |          |
     *                         | Dropdown |
     *                         |          |
     *                         |__________|
     * 
     * If the element is positioned at the top, then:
     * 
     *                         |-----------| -> We would get this if we did `fiedEditDropdownRect.top`, that's not what we want.
     *                         |           |
     *                         | Dropdown  |
     *                         |           |
     *                         |           |
     * |----------------------------------||
     * |                       |__________|| -> IF the dropdown is positioned at the top, then we want to retrieve the `fieldEditDropdownRect.bottom`      
     * |                               ... |    because this is kinda the same position as `fieldEditDropdownRect.top` when the dropdown is positioned
     * |                                   |    at the bottom.
     * |----------------------------------||
     * 
     * Okay, so now you understand why we get the top and why we get the bottom if the dropdown menu is positioned at the top or the bottom.
     * Then we will check for the available space that we have to build the dropdown container at the top of the button, and at the bottom of the button.
     * 
     * If we have more space at the top then we will build the dropdown menu at the top, otherwise we will build it a the bottom. 
     * 
     * Important: We only change the state if the values actually change, otherwise we calculate but we don't change the state.
     */
    function webLoadDropdownMenuTopOrDownAndDefineHeight() {
        if (APP === 'web' && dropdownButtonRef.current && dropdownMenuRef.current) {
            const dropdownButtonRect = dropdownButtonRef.current.getBoundingClientRect()
            const dropdownMenuRect = dropdownMenuRef.current.getBoundingClientRect()
            const doesPassBottom = dropdownButtonRect.bottom + dropdownMenuRect.height > window.innerHeight
            const doesPassRight = dropdownButtonRect.right + dropdownMenuRect.width > window.innerWidth
            let maxHeight = window.innerHeight - dropdownButtonRect.bottom
            let yPosition = dropdownButtonRect.bottom
            let xPosition = dropdownButtonRect.left - ( isCentered === true ? (dropdownMenuRect.width / 2) - (dropdownButtonRect.width/2)  : 0 )

            if (doesPassBottom === true) {
                // will load on top
                yPosition = dropdownButtonRect.top - dropdownMenuRect.height
                if (yPosition < 0) yPosition = 0

                maxHeight = dropdownButtonRect.top - dropdownButtonRect.height - 5
            }
            if (doesPassRight === true) {
                xPosition = dropdownButtonRect.right - (isCentered == true ? (dropdownMenuRect.width / 2) + (dropdownButtonRect.width/2) : dropdownMenuRect.width)
                if (xPosition < 0) xPosition = 0
            }

            const hasPositionChanged = dropdownMenuPosition.position.x !== xPosition || dropdownMenuPosition.position.y !== yPosition || 
                dropdownMenuPosition.maxHeight !== maxHeight

            if (hasPositionChanged === true) {
                setDropdownMenuPosition({
                    wasCalculated: true,
                    position: { 
                        x: xPosition, 
                        y: yPosition 
                    }, 
                    maxHeight: maxHeight
                })
            }
        }
    }

    /**
     * This will open the dropdown for the user when he clicks a button or do some behaviour in the dropdownButtonRef.
     * It is a toogle so when the user clicks the first time it will open, the second time it will close.
     * 
     * @param {boolean} isOpen - false if we are closing the input, true otherwise.
     */
     function onToggleDropdownMenu(isOpen=!isDropdownOpen) {
        setIsDropdownOpen(isOpen)
        if (isOpen === false) {
            setDropdownMenuPosition({
                wasCalculated: false,
                position: {
                    x: 0,
                    y: 0
                },
                maxHeight: null
            })
        }
    }

    /**
     * We will add event listeners to the window, so when the user resizes the window we will recalculate the dropdown menu position.
     */
    useEffect(() => {
        if (APP === 'web') {
            window.addEventListener('resize', webLoadDropdownMenuTopOrDownAndDefineHeight)
        } 
        return () => {
            if (APP === 'web') {
                window.removeEventListener('resize', webLoadDropdownMenuTopOrDownAndDefineHeight)
            }
        }
    }, [])

    useEffect(() => {
        const isDropdownOpenAndPositionIsNotCalculated = isDropdownOpen === true && dropdownMenuPosition.wasCalculated === false
        if (isDropdownOpenAndPositionIsNotCalculated) {
            webLoadDropdownMenuTopOrDownAndDefineHeight()
        }
    }, [isDropdownOpen])

    useEffect(() => {
        if (isOpen !== isDropdownOpen) {
            onToggleDropdownMenu(isOpen)
        }
    }, [isOpen])

    return {
        dropdownButtonRef,
        dropdownMenuRef,
        webLoadDropdownMenuTopOrDownAndDefineHeight,
        isDropdownOpen,
        dropdownMenuPosition,
        onToggleDropdownMenu
    }
}