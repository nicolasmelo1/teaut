/**
 * / * MOBILE ONLY * /
 * 
 * Hook supposed to be used to display and debug code inside of webviews in our application.
 * It's kinda hard working with webviews because there is no proper way of debugging it, you can use chrome
 * and other stuff but some times it's just not ideal. So we use this function to make logging easy.
 * 
 * This is the reference from where this code is from: https://stackoverflow.com/a/68090303
 * 
 * @returns {{
 *      webViewDebugging: string,
 *      onDebugMessage: (
 *          event: import('react-native').NativeSyntheticEvent, 
 *          callback: (event: import('react-native').NativeSyntheticEvent) => void
 *      ) => void
 * }} - The webview debugging is supposed to be inserted in the `injectedJavaScript` of the WebView component
 * and `onDebugMessage` is supposed to be inserted in `onMessage` argument.
 */
export default function useDebugWebView() {
    /**
     * Reference on the second argument of JSON.stringfy: https://stackoverflow.com/a/18089155
     */
    const webViewDebugging = `
        // Debug
        const consoleLog = (type, log) => window.ReactNativeWebView.postMessage(
            JSON.stringify({
                'type': 'Console', 
                'data': {
                    'type': type, 
                    'log': log
                }
            }, function (key, value) {
                if (typeof value === 'function') {
                    return value.toString()
                } else {
                    return value
                }
            })
        )

        console = {
           log: (log) => consoleLog('log', log),
           debug: (log) => consoleLog('debug', log),
           info: (log) => consoleLog('info', log),
           warn: (log) => consoleLog('warn', log),
           error: (log) => consoleLog('error', log),
        }
    `

    /**
     * This function is needed to log stuff in the console from the webview.
     * You should add this to `onMessage` argument of the WebView component
     * 
     * @param {import('react-native').NativeSyntheticEvent} event 
     * @param {(event: import('react-native').NativeSyntheticEvent) => void} callback 
     */
    function onDebugMessage(event, callback) {
        let dataPayload = null
        try {
            dataPayload = JSON.parse(event.nativeEvent.data)
        } catch (e) {}
        
        if (dataPayload !== null) {
            if (dataPayload.type === 'Console') {
                console.info(`[WebViewConsoleLog] ${JSON.stringify(dataPayload.data)}`);
            } else {
                callback(event)
            }
        }
    }

    return {
        onDebugMessage,
        webViewDebugging
    }
}