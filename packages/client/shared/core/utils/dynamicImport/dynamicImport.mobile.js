import { APP } from '../../../conf'

/**
 *     /-----------/
 *   /MOBILE ONLY/
 * /-----------/
 * 
 * By default we import this on web, we use webpack alias configuration to get the right import. See next.config.js in `web` folder
 * 
 * IMPORTANT: You will notice that we repeat code between environments, webpack prevent dynamic imports like
 * require(<variable_here>), it needs full imports. So we need to set the hole string.
 *
 * IMPORTANT2: make sure the lib is exists for your environment. If you need to add a new lib, update this file
 * for your environment.
 * 
 * Since we share the same code between different environments (web With React, mobile with React Native and desktop with Electron) 
 * we need this code so we don't need to have the same packages on both environments (like install react-native-gesture-handler for web
 * or react-bootstrap for mobile)
 * 
 * With this if you need to import a package that will be only be availabe for your environment you use this function.
 * 
 * Let's go with an example:
 * Suppose we need the `Spinner` from 'react-bootstrap' how we import this is like:
 * ` import { Spinner } from 'react-bootstrap' `
 * With this function we import like this:
 * const Spinner = dynamicImport('react-bootstrap', 'Spinner') // Notice that we pass the object to be importad as a string
 * 
 * If the module is not found it returns null. SO ALWAYS MAKE SURE THIS MODULE IS NEVER USED IN YOUR CURRENT ENVIRONMENT
 * 
 * TIP: To make sure of what is your current environment you can set it with 'APP' environment variable.
 * 
 * @param {String} module - The module to import
 * @param {String} alias - This is the alias to import. By default we set this to 'default'.
 * If you want to import Spinner from 'react-bootstrap' using normal require you would make it like this:
 * 
 * `const Spinner = require('react-bootstrap').Spinner`
 * 
 * using this function you make it like this:
 * 
 * `const Spinner = dynamicImport('react-bootstrap', 'Spinner')`
 * 
 * If you don't need to import an alias like this example:
 * 
 * `const html2pdf = require('html2pdf')`
 * 
 * you need to:
 * 
 * `const html2pdf = dynamicImport('html2pdf', '')`
 */
const dynamicImport = (module, alias='default') => {
    if (APP === 'mobile') {
        try {
            // update here to add new packages for mobile
            const packages = {
                'expo-linking': require('expo-linking'),
                '@react-native-async-storage/async-storage': require('@react-native-async-storage/async-storage'),
                'react-native-react-bridge': require('react-native-react-bridge'),
                'react-native-webview': require('react-native-webview')
            }
            if (alias !== '') {
                return packages[module][alias]
            } else {
                return packages[module]
            }
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                return null
            } else {
                return null
            }
        }
    }
    return null
}

export default dynamicImport