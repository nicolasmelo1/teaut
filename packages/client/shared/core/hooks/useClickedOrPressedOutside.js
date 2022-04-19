import { useRef, useEffect } from 'react'
import { APP } from '../../conf'

let registeredCallbacks = {}

/**
 * Hook that calls a callback when the user clicks or presses outside of the passed.
 * 
 * Reference: https://stackoverflow.com/a/42234988
 * 
 * HOW TO USE:
 * / * ON WEB * / 
 * ```
 * function MyComponent() {
 *      const [isOpen, setIsOpen] = useState(false)
 *      const elementRef = useRef()
 *      useClickedOrPressedOutside({ currentRef: elementRef, callback: closeWhenUserClicksOutside })
 * 
 *      function closeWhenUserClicksOutside() {
 *          setIsOpen(false)          
 *      }
 * 
 *      return (
 *          <div ref={elementRef}>
 *              <p>
 *                  Custom Text
 *              </p>
 *          </div>
 *      )
 * }
 * ```
 * 
 * Let's break down, the idea is that you pass the reference of the element that you want to IGNORE when it is clicked, this means that if the user clicks this
 * or inside of this element the callback will not be called. Otherwise the callback will be called. Understand that we don't need to do any more configuration.
 * 
 * / * ON NATIVE * /
 * ```
 * function OuterComponent() {
 *      return (
 *          <Pressable
 *          onPress={(e) => useClickedOrPressedOutside().onPress(e)}
 *         >
 *             <View>    
 *                {props.children}
 *            </View>   
 *          </Pressable>
 *      )
 * }
 * 
 * function InnerComponent() {
 *      const [isOpen, setIsOpen] = useState(false)
 *      const containerRef = useRef()
 *      useClickedOrPressedOutside({ currentRef: containerRef, callback: closeWhenUserPressesOutside })
 * 
 *      function closeWhenUserPressesOutside() {
 *          setIsOpen(false)          
 *      }
 * 
 *      return (
 *          <OuterComponent>
 *              <View
 *              ref={containerRef}
 *              >
 *                  <Text>
 *                      {'ALOU'}
 *                  </Text>
 *              </View>
 *          </OuterComponent>
 *     )
 * }
 * ```
 * 
 * Understand here that we have 2 parts. First we need to add the `onPress` event to the `Pressable` component. This Pressable component must exist as above as you can in the 
 * app structure. IT will detect any onPress events. And similar to the web version, it will only call the callback when the user clicks any element outtside of a company.
 * 
 * For both use cases you need to pass the ref of the element.
 * 
 * @param {object} clickedOrPressedOutsideParams - THe params for the hook.
 * @param {object} [clickedOrPressedOutsideParams.customRef=null] - The ref of the target element. This means the element that will call the callback
 * behaviour.
 * @param {(event: MouseEvent | import('react-native').NativeEventEmitter) => void} [clickedOrPressedOutsideParams.callback=null] - The callback that 
 * will be called when the user clicks or presses outside of the target element.\
 * 
 * @returns {
 *     ref: {current: any},
 *     onPress: (event: MouseEvent | import('react-native').NativeEventEmitter) => void
 * }
 */
export default function useClickedOrPressedOutside({ callback=null, customRef=null }={}) {
    const ref = useRef(null)

    if (APP === 'web') {
        useEffect(() => {
            /**
             * Alert if clicked on outside of element
             */
            function handleClickOutside(event) {
                const isCustomRefDefined = customRef !== null && typeof customRef === 'object'
                if (isCustomRefDefined && customRef.current && !customRef.current.contains(event.target)) {
                    callback(event)
                } else if (ref.current && !ref.current.contains(event.target)) {
                    callback(event)
                }
            }
    
            // Bind the event listener
            document.addEventListener("mousedown", handleClickOutside)
            return () => {
                // Unbind the event listener on clean up
                document.removeEventListener("mousedown", handleClickOutside)
            }
        }, [])
        
        return { 
            ref 
        }
    } else {
        if (callback !== null) {
            registeredCallbacks[callback.name] = {
                ref: ref,
                callback: callback
            }
        }
        return {
            ref,
            onPress: (e) => {
                /**
                 * I don't know a better way to do this except to loop through all of the children elements of an component and check if the event target is inside of it.
                 * That's basically the hole idea. On React itself we have an easier way to do this, but on react native we need to do this instead which i know is not perfect
                 * but it's the best we can do at the current time.
                 * 
                 * @param {import('react').Component} parent - The parent to check if contains the children.
                 * @param {import('react').Component} toCheck - The children to check if is contained in the parent.
                 * 
                 * @returns {Promise<boolean>} - This is a promise that evaluates to true or false. It needs to be a promise because it will make it more performant (i hope).
                 */
                const traverse = async (parent, toCheck) => {
                    if (parent === toCheck) {
                        return true
                    } else if (![null, undefined].includes(parent._children)) {
                        for (const child of parent._children) {
                            const result = await traverse(child, toCheck)
                            if (result === true) {
                                return result
                            }
                        }
                    }
                    return false
                }
                Object.values(registeredCallbacks).forEach(({ ref, callback }) => {
                    if (![null, undefined].includes(ref.current)) {
                        traverse(ref.current, e.target).then(isElementClickedChildrenOfRef => {
                            if (!isElementClickedChildrenOfRef) {
                                callback(e)
                            }
                        })
                    }
                })
            }
        }
    }
}

