import { useEffect } from 'react'

import Body from './Body'

/**
 * This component is supposed to hold all of the logic needed to render any page. Instead of using the default Next _app.js
 * and override this, we want to keep the app as simple as possible so it is understandable and also doesn't contain many logic.
 * 
 * Here however will contain most logic that is needed to render the pages of reflow.
 * 
 * Also the idea for creating this component is to be able to use the global context state. Since we keep the global context
 * as above as possible inside of the app, we cannot use the context on the app that we render the provider on.
 */
export default function Main(props) {
    /**
     * This will run when the app is loaded on the screen. The idea is that this will calculate the
     * width and height of the app so we can use both variables inside of CSS.
     * 
     * This will also add the eventListener of resizing to the function so when the user resize the screen
     * the app-height and app-width variables will also change.
     */
    function setAppDefaults() {
        if (window !== undefined) {
            document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
            document.documentElement.style.setProperty('--app-width', `${window.innerWidth}px`)

            window.removeEventListener('resize', setAppDefaults)
            window.addEventListener('resize', setAppDefaults)
        }
    }

    useEffect(() => {
        setAppDefaults()
    }, [])

    return (
        <Body>
            {props.children}
        </Body>
    )
}