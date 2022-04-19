import { useEffect, useState, useRef } from 'react'
import { useTheme } from 'styled-components'
import { APP } from '../../../conf'
import Layout from './layouts'

/**
 * This is a tooltip component, the tooltip component is most useful for the web version of the application but on mobile it can be understanded as 
 * a toast. 
 * 
 * The idea of it is to display some extra information below, above, at the left or right of the element that is being hovered over or clicked on.
 * 
 * The idea is HEAVILY inspired by this: 
 * https://react-bootstrap.github.io/components/overlays/#overview
 * And the above is inspired by:
 * https://popper.js.org/
 * 
 * That's all it does. I don't understand yet how this would be implemented on the mobile side but this CAN be implemented on mobile.
 * Idea for mobile devices: https://reactnativeelements.com/docs/tooltip

 * @param {object} props - The props that the tooltip component recieves.
 * @param {boolean} [props.isOpen=false] - If the tooltip is open or on closed state.
 * @param {Array<'left' | 'right' | 'top' | 'bottom'> | 'left' | 'right' | 'top' | 'bottom'} [props.placement=['left', 'right', 'top', 'bottom']] - The possible placements 
 * of the tooltip. If nothing is defined then we can place the element in all four directions, otherwise you send an array of the possible directions we can place the tooltip.
 * @param {Array<'hover' | 'click'>} [props.trigger=['hover', 'click']] - The possible triggers of the tooltip. If nothing is defined then we can trigger the 
 * tooltip on the hover of the mouse on the element or when we click.
 * @param {string} [props.text=''] - The text that we want to display in the tooltip, this will display a simple text in the tooltip, by default we will not break the line.
 * @param {string} [props.color=import('../../utils').themes.default.gray_REFLOW] - The color of the backgound of the tooltip, by default we will colorize the arrows 
 * and also the background of the tooltip.
 * @param {boolean} [props.isToShowArrows=true] - If we want to show the arrows or not, by default we will show the arrows pointing to the element that is being hovered over.
 * @param {import('react').ReactElement} [props.customContent=null] - This is the content that we want to display in the tooltip. This enables you to create your own contents.
 * So for example, when the user hovers over an element we want to display an formulary so he can edit something. Or when he clicks we can display a custom video, whatever.
 * This custom content should handle it's own data, and should not depend on anything outside of it. Because if the props change, this custom content will not change.
 * 
 * @returns {import('react').ReactElement} - The tooltip component.
 */
export default function Tooltip(props) {
    const theme = useTheme()

    const isTooltipOpen = typeof props.isOpen === 'boolean' ? props.isOpen : false
    const placement = Array.isArray(props.placement) ? props.placement : typeof props.placement === 'string' ? [props.placement] : ['left', 'right', 'top', 'bottom']
    const trigger = Array.isArray(props.trigger) ? props.trigger : ['hover', 'click']
    const text = typeof props.text === 'string' ? props.text : ''
    const tooltipBackgroundColor = typeof props.color === 'string' ? props.color : theme.gray_REFLOW
    const customContent = ![null, undefined].includes(props.customContent) ? props.customContent : null
    const isToShowArrows = typeof props.isToShowArrows === 'boolean' ? props.isToShowArrows : true

    const [isOpen, _setIsOpen] = useState(isTooltipOpen)
    const [tooltipPosition, setTooltipPosition] = useState({
        placement: ['bottom', 'right'],
        position: { x: 0, y: 0 },
        maxHeight: APP === 'web' ? window.innerHeight : null, 
        maxWidth: APP === 'web' ? window.innerWidth : null,
        wasCalculated: true
    })
    const isOpenRef = useRef(isTooltipOpen)
    const containerRef = useRef()
    const tooltipRef = useRef()

    function setIsOpen(isTooltipOpen) {
        isOpenRef.current = isTooltipOpen
        _setIsOpen(isTooltipOpen)
    }

    /**
     * / * WEB ONLY * /
     * 
     * By now we've been doing this extensively on the application. The idea is simple:
     * we will calculate where the tooltip should be rendered and positioned in the DOM. 
     * By default we try to render on the right side of the element. Otherwise we will try
     * to render on the bottom, then on the left and finally if nothing else fits, we will
     * render on the top of the element. 
     * 
     * Obviously, this positions are only rendered like that if they are not enforced. If
     * you can also enforce to render the tooltip at certain positions of the screen. Also,
     * of course that this will work only on web.
     * 
     * We will not explain the calculations here as you might already know from other places, so it
     * needs some special care and thinking, but it's not that difficult to grasp, just need some
     * special attention. It might be easier to understand if you try to draw in a sheet of paper.
     * If you can, you can also document the calculations in the code.
     */
    function webCalculateTooltipPosition() {
        if (APP === 'web' && tooltipRef.current && containerRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect()
            const containerRect = containerRef.current.getBoundingClientRect()
            const doesTooltipPassRight = containerRect.right + tooltipRect.width > window.innerWidth
            const doesTooltipPassLeft = containerRect.left - tooltipRect.width < 0
            const doesTooltipPassBottom = containerRect.bottom + tooltipRect.height > window.innerHeight
            
            // You understand that placing the tooltip on the top is the default, so what we do is define if we are able to load on the top or not.
            // Then we will see if we can load on the previous position and so on. 
            // So let's see this, the tooltip passed the right and the bottom so by default we will load on the left, but on the left the tooltip also
            // passed. So by default we will load on the top, but hey, we can't load the tooltip on the top, the user hasn't defined it as a valid position.
            // So we load on the left even though there's no actual space for it.
            const isAbleToLoadOrEnforceTop = placement.includes('top')
            const isAbleToLoadOrEnforceLeft = (doesTooltipPassLeft === false || isAbleToLoadOrEnforceTop === false) && placement.includes('left')
            const isAbleToLoadOrEnforceBottom = (doesTooltipPassBottom === false || (isAbleToLoadOrEnforceLeft === false && isAbleToLoadOrEnforceTop === false)) && placement.includes('bottom')
            const isAbleToLoadOrEnforceRight = (doesTooltipPassRight === false ||  (isAbleToLoadOrEnforceLeft === false && isAbleToLoadOrEnforceTop === false && isAbleToLoadOrEnforceBottom === false)) && placement.includes('right')

            const horizontalMiddle = containerRect.width / 2 - tooltipRect.width / 2
            const verticalMiddle = containerRect.height / 2 - tooltipRect.height / 2

            const tooltipPosition = {
                wasCalculated: true,
                placement: ['top'],
                position: {
                    x: 0,
                    y: 0
                },
                maxHeight: null,
                maxWidth: null
            }
            // default load on the right side
            if (isAbleToLoadOrEnforceRight) {
                let defaultYPosition = containerRect.top + verticalMiddle
                tooltipPosition.position.x = containerRect.right
                if (defaultYPosition + tooltipRect.height > window.innerHeight) {
                    defaultYPosition = defaultYPosition - (defaultYPosition + tooltipRect.height - window.innerHeight)
                }
                if (defaultYPosition < 0) defaultYPosition = 0
                tooltipPosition.position.y = defaultYPosition
                tooltipPosition.maxHeight = window.innerHeight - defaultYPosition
                tooltipPosition.maxWidth = window.innerWidth - tooltipPosition.position.x
                tooltipPosition.placement = ['right']
                setTooltipPosition(tooltipPosition)
                return
            }
            // load on the bottom side
            if (isAbleToLoadOrEnforceBottom) {
                let defaultXPosition = containerRect.left + horizontalMiddle
                tooltipPosition.position.y = containerRect.bottom
                if (defaultXPosition + tooltipRect.width > window.innerWidth) {
                    defaultXPosition = defaultXPosition - (defaultXPosition + tooltipRect.width - window.innerWidth)
                }
                if (defaultXPosition < 0) defaultXPosition = 0
                tooltipPosition.position.x = defaultXPosition
                tooltipPosition.maxHeight = window.innerHeight - tooltipPosition.position.y
                tooltipPosition.maxWidth = window.innerWidth - defaultXPosition
                tooltipPosition.placement = ['bottom']
                setTooltipPosition(tooltipPosition)
                return
            }
            // load on the left side
            if (isAbleToLoadOrEnforceLeft) {
                let defaultYPosition = containerRect.top + verticalMiddle
                tooltipPosition.position.x = containerRect.left - tooltipRect.width
                if (defaultYPosition + tooltipRect.height > window.innerHeight) {
                    defaultYPosition = defaultYPosition - (defaultYPosition + tooltipRect.height - window.innerHeight)
                }
                if (defaultYPosition < 0) defaultYPosition = 0
                tooltipPosition.position.y = defaultYPosition
                tooltipPosition.maxHeight = window.innerHeight - defaultYPosition
                tooltipPosition.maxWidth = containerRect.left
                tooltipPosition.placement = ['left']
                setTooltipPosition(tooltipPosition)
                return
            } 
            if (isAbleToLoadOrEnforceTop) {
                // load on the top side
                let defaultXPosition = containerRect.left + horizontalMiddle
                let defaultYPosition = containerRect.top - tooltipRect.height
                if (defaultXPosition + tooltipRect.width > window.innerWidth) {
                    defaultXPosition = defaultXPosition - (defaultXPosition + tooltipRect.width - window.innerWidth)
                }
                if (defaultXPosition < 0) defaultXPosition = 0
                if (defaultYPosition < 0) defaultYPosition = 0
                tooltipPosition.position.x = defaultXPosition
                tooltipPosition.position.y = defaultYPosition
                tooltipPosition.maxHeight = containerRect.top
                tooltipPosition.maxWidth = window.innerWidth - defaultXPosition
                tooltipPosition.placement = ['top']
                setTooltipPosition(tooltipPosition)
                return
            }
        }
    }

    /**
     * Open or closes the tooltip and changes the state if it is open or closed.
     *
     * @param {boolean} isOpen - Is the tooltip open or closed? True if open, false if closed.
     */
    function onOpenOrClose(isOpen) {
        setIsOpen(isOpen)
    }

    /**
     * On the web, this is for when the user clicks or moves the mouse outside of the tooltip or the element where the tooltip is on.
     * 
     * @param {MouseEvent} e - The mouse event that triggered the function.
     */
    function webOnMouseMoveOrClick(e) {
        if (containerRef.current && containerRef.current.contains(e.target) && isOpenRef.current === false) {
            onOpenOrClose(true)
        } else if (containerRef.current && !containerRef.current.contains(e.target) && isOpenRef.current === true) {
            onOpenOrClose(false)
        }
    }

    /**
     * / * WEB ONLY * / 
     * 
     * When the user scrolls any scrollbar in the window we will recalculate the tooltip position, obviously this might
     * make it kinda slow, but it's not a problem for us since most users will be using this from the browser, and we are implementing
     * a full mobile version of the app.
     */
    function webOnScroll() {
        if (isOpenRef.current === true) {
            webCalculateTooltipPosition()
        }
    }

    /**
     * This effect will listen for resize events in the window but also for scroll events in the hole document. 
     * 
     * Here is the reference for it: https://stackoverflow.com/a/30723677
     */
    useEffect(() => {
        if (APP) {
            if (trigger.includes('hover')) document.addEventListener('mousemove', webOnMouseMoveOrClick)
            if (trigger.includes('click')) document.addEventListener('mousedown', webOnMouseMoveOrClick)
            window.addEventListener('resize', webCalculateTooltipPosition)
            document.addEventListener('scroll', webOnScroll, true)
        }
        return () => {
            if (APP) {
                if (trigger.includes('hover')) document.removeEventListener('mousemove', webOnMouseMoveOrClick)
                if (trigger.includes('click')) document.removeEventListener('mousedown', webOnMouseMoveOrClick)
                window.removeEventListener('resize', webCalculateTooltipPosition)
                document.removeEventListener('scroll', webOnScroll, true)
            }
        }
    }, [])

    /**
     * This effect will run when we open or close the modal to the user. If we open the tooltip then we will calculate
     * the tooltip position on the screen. Otherwise we will reset the position to the original state.
     * 
     * On the web when the tooltip is open, we will calculate the position where it should be rendered on the screen.
     * We only show the tooltip after the position had been calculated.
     * 
     * When we close the tooltip we will reset the position of the tooltip to the original position so next time we will calculate everything again
     * from the start. (We do this because since we change the max width and height of the tooltip, this might mess with the position of the tooltip 
     * on the next calculation)
     */
    useEffect(() => {
        if (APP === 'web') {
            if (isOpen === true) {
                webCalculateTooltipPosition()
            } else {
                setTooltipPosition({
                    wasCalculated: false,
                    placement: ['bottom', 'right'],
                    position: { x: 0, y: 0 },
                    maxWidth: null,
                    maxHeight: null
                })
            }
        }
    }, [isOpen])

    /**
     * This effect will run when the props change for when the tooltip is opened or closed. When we do this we update the state here internally
     * for the tooltip.
     */
    useEffect(() => {
        if (typeof props.isOpen === 'boolean' && props.isOpen !== isOpen) {
            onOpenOrClose(props.isOpen)
        }
    }, [props.isOpen])

    return (
        <Layout
        tooltipRef={tooltipRef}
        containerRef={containerRef}
        isToShowArrows={isToShowArrows}
        text={text}
        tooltipBackgroundColor={tooltipBackgroundColor}
        tooltipPosition={tooltipPosition}
        customContent={customContent}
        isOpen={isOpen}
        children={props.children}
        />
    )
}