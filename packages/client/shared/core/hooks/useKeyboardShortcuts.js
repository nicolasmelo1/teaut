import { useEffect, useRef } from 'react'
import { APP } from '../../conf'
import { getOS } from '../utils'

export default function useKeyboardShortcuts(callbacks={}, {
    useCtrlAsCmdOnMac=true, isToPreventCallingTwice=false
}={}) {
    const callbacksByKeyStrokesRef = useRef([])
    const isKeyPressedRef = useRef(false)

    /**
     * This is used to validate if some certain keystrokes were pressed while pressing other keys.
     * 
     * @param {KeyboardEvent} keyboardEvent - The keyboard event recieved from 'keydown' event.
     * @param {Array<string>} commandKeys - And array of all of the keys that should be pressed to run the command.
     */
    function validateSpecialCommandKey(keyboardEvent, commandKeys) {
        let areAllSpecialCommandKeysValidated = true

        const hasMetaKeyInCommandAndIsMetaKeyPressed = commandKeys.includes('meta') && keyboardEvent.metaKey
        const hasCtrlKeyInCommandAndIsCtrlKeyPressed = commandKeys.includes('ctrl') && keyboardEvent.ctrlKey
        const hasAltKeyInCommandAndIsAltKeyPressed = commandKeys.includes('alt') && keyboardEvent.altKey
        const hasShiftKeyInCommandAndIsShiftKeyPressed = commandKeys.includes('shift') && keyboardEvent.shiftKey

        if (hasMetaKeyInCommandAndIsMetaKeyPressed) {
            areAllSpecialCommandKeysValidated = areAllSpecialCommandKeysValidated && true
        } 
        if (hasCtrlKeyInCommandAndIsCtrlKeyPressed) {
            areAllSpecialCommandKeysValidated = areAllSpecialCommandKeysValidated && true
        }
        if (hasAltKeyInCommandAndIsAltKeyPressed) {
            areAllSpecialCommandKeysValidated = areAllSpecialCommandKeysValidated && true
        }
        if (hasShiftKeyInCommandAndIsShiftKeyPressed) {
            areAllSpecialCommandKeysValidated = areAllSpecialCommandKeysValidated && true
        }

        return areAllSpecialCommandKeysValidated
    }

    /**
     * Function used to be called on the `keydown` event. Whenever the user presses a key, this function will be called.
     * 
     * @param {KeyboardEvent} e - The keyboard event recieved from 'keydown' event.
     */
    function onListenToKeyboardShortcuts(e) {
        for (const [commandKeys, callback] of callbacksByKeyStrokesRef.current) {
            const isKeysPressedSameFromCommand = validateSpecialCommandKey(e, commandKeys) && commandKeys.includes(e.key)
           if (isKeysPressedSameFromCommand) {
                e.preventDefault()
                if (isKeyPressedRef.current === false) callback()
                if (isToPreventCallingTwice && isKeyPressedRef.current === false) {
                    isKeyPressedRef.current = true
                }
           }
        }
    }

    /**
     * THis is a function that is called when the key is released. This way we can fire the callback just once and not twice, 
     * thrice and whatever.
     * 
     * This is only used when the `isToPreventCallingTwice` is set to `true`.
     */
    function onKeyUp(e) {
        if (isKeyPressedRef.current === true) {
            isKeyPressedRef.current = false
        }
    }

    /**
     * Function used for transforming the keys to the an array of keys. Instead of 'cmd + b' we can have ['meta', 'b'].
     * 
     * This way we can handle when some keys are pressed inside of the browser.
     */
    function callbacksToArray() {
        callbacksByKeyStrokesRef.current = []
        for (const [shortcut, callback] of Object.entries(callbacks)) {
            const trimedShortcut = shortcut.replace(/ /g,'')
            const keys = trimedShortcut.split('+').map(key => {
                if (key === 'ctrl') {
                    const isAppleComputer = ['macos', 'ios'].includes(getOS())
                    if (isAppleComputer && useCtrlAsCmdOnMac === true) return 'meta'
                    else return 'control'
                } else if (key === 'alt') return 'alt'
                else if (key === 'shift') return 'shift'
                else if (key === 'cmd') return 'meta'
                else return key.toLowerCase()
            })
            
            callbacksByKeyStrokesRef.current.push([keys, callback])
        }
    }

    useEffect(() => {
        if (APP === 'web') {
            document.addEventListener('keydown', onListenToKeyboardShortcuts)
            document.addEventListener('keyup', onKeyUp)
        }
        return () => {
            if (APP === 'web') {
                document.removeEventListener('keydown', onListenToKeyboardShortcuts)
                document.addEventListener('keyup', onKeyUp)
            }
        }
    }, [])

    useEffect(() => {
        if (APP === 'web') callbacksToArray()
    }, [callbacks])
}