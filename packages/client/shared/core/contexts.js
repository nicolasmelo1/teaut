import { APP } from '../conf'
import { createElement } from 'react'
import dynamicImport from "./utils/dynamicImport"

const AsyncStorage = dynamicImport('@react-native-async-storage/async-storage')

/**
 * This provides a way to create a global state that can be used in any component inside the application.
 * 
 * It's a REALLY simple api that will work with any context api created. This way to define it as a global context
 * you need to register your context using `registerProviders` function here.
 * 
 * For example:
 * 
 * 1. First we have to create the context as well as the provider (creating the provider is EXTREMELY important)
 * IMPORTANT: In the provider look that we pass {props.children} in the render. This is important.
 * ```
 * const initialState = {
 *   state: {
 *       isAuthenticated: false,
 *   },
 *   setState() = {}
 * }
 * export const AuthenticationContext = createContext(initialState)
 * 
 * function AuthenticationProvider(props) {
 *      const [state, setState] = useState(initialState.state)
 * 
 *      return (
 *          <AuthenticationContext.Provider value={{
 *              state,
 *              setState,
 *          }}>
 *              {props.children}
 *          </AuthenticationContext.Provider>
 *      )
 * }
 * ```
 * 
 * 2. Now we need to register the provider using the `registerProviders` function.
 * ```
 * GlobalProvider.registerProviders(AuthenticationProvider)
 * ```
 * 
 * That's it, now you have this context registered as global.
 * 
 * So how to use it?
 * 
 * Above everything, in your App.js or your custom next.js _app.js file you need to import this GlobalProvider and define 
 * it like this:
 * ```
 * function MyApp({ Component, pageProps } = {}) {
 *      return (
 *          <GlobalProvider.Provider>
 *              <Main>
 *                  <Component {...pageProps} />
 *              </Main>
 *          </GlobalProvider.Provider>
 *      )
 * }
 * ```
 * 
 * Really simple, and an API without needing redux, we can also add persist functionality to persist the state without complicated
 * stuff like redux. I know this code seems kinda complicated at first, but trust me, it's simpler than redux. Redux is too bloated
 * and complex.
 * 
 * @returns {{
 *     registerProviders: (provider: React.Component) => void,
 *     Provider: React.Component
 * }} - Returns an object with registerProviders function to add a provider and Provider component to be used.
 */
function GlobalProviderInitializer() {
    const providers = []

    return {
        /**
         * Is used for registering a provider (It's nice because we only register the contexts that are actually used by the code.)
         * You need to pass a react component that will be used as a provider for your context to be available to all.
         * 
         * @param {React.Component} provider - The provider that will be used to register the context.
         */
        registerProviders: (provider) => {
            providers.push(provider)
        }, 
        Provider: (props) => {
            /**
             * This is kinda strange but we need to render here without JSX to compose one component inside of other, this way
             * we will have a global context to use similar to how redux works but A LOT easier.
             * 
             * This gives us a really nice explanation on how createElement works:
             * https://stackoverflow.com/a/70279264
             * 
             * It's specially useful for functional components like what we use here.
             */
            const getProviders = () => {
                let LastComponent = props.children
                for (let i=0; i<providers.length; i++) {
                    LastComponent = createElement(providers[i], null, LastComponent)
                }
                return LastComponent
            }
            return getProviders()
        }
    }
}

/**
 * This will get the state for a given contextName. With this we are able to store the state of a given context in
 * the memory of the application. So when the user opens again we are able to load data from this state.
 * 
 * @param {string} contextName - The name of the context that we want to get the state for.
 * @param {object} initialState - The initialState so if we add some new data in the state it does not break. This means 
 * is that suppose we have the following state in the context:
 * ```
 * state = {
 *   selectedApp: null,
 * }
 * ```
 * Then after some time we decide that
 * ```
 * state = {
 *   selectedApp: null,
 *   selectedArea: {}
 * }
 * ```
 * The state in the persist storage will be the first state but what about the `selectedArea` that we 
 * added? That's why we need the initial state.
 * We will add the initial state to the state retrieved.
 * 
 * @param {(state: any) => void} [setState=undefined] - The callback that will be called when the state is retrieved. 
 * The problem is that you don't have much control with this method, this will only pass the state to the callback if 
 * the state is neither null nor undefined.
 * 
 * @returns {Promise<object>} - The state of the context.
 */
export async function getPersistState(contextName, initialState, setState = undefined) {
    let state = null
    const doesLocalStorageExists = window.localStorage !== undefined && localStorage !== undefined
    if (APP === 'web' && doesLocalStorageExists) {
        const rawState = localStorage.getItem(contextName)
        if (rawState !== null) {
            state = JSON.parse(rawState)
            state = {
                ...initialState,
                ...state
            }
        }
    } else if (APP !== 'web') {
        try {
            const rawState = await AsyncStorage.getItem(contextName)
            if (rawState !== null) {
                state = JSON.parse(rawState)
                state = {
                    ...initialState,
                    ...state
                }
            }
        } catch (e) {}
    }

    if (typeof setState === 'function' && state !== null && state !== undefined) {
        setState(state)
        return state
    } else {
        return state
    }
}

/**
 * This will persist some state inside of the application so you can retrieve it again. All data persisted is just a string
 * so you can store any type of data that you want except for functions and classes. But booleans, numbers or strings
 * are valid.
 * 
 * All your data persisted is named so be aware of that when you want to retrieve this persisted data.
 * 
 * @param {string} contextName - The name of the context that we want to persist the state for.
 * @param {object} state - The state that we want to persist.
 * @param {(state: any) => void} [setState=undefined] - The callback that will be called after the state is persisted. 
 * The problem with this approach is that you don't have much control with this method.
 * 
 * @returns {Promise<void>} - Returns a promise that resolves when the state is persisted.
 */
export async function setPersistState(contextName, state, setState=undefined) {
    if (APP === 'web' && window.localStorage !== undefined && localStorage !== undefined) {
        localStorage.setItem(contextName, JSON.stringify(state))
    } else if (APP !== 'web') {
        await AsyncStorage.setItem(contextName, JSON.stringify(state))
    }
    
    if (setState !== undefined) {
        setState(state)
    }
}

export default GlobalProviderInitializer()