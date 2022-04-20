import { createContext, useState, useEffect } from 'react'
import GlobalProvider, { setPersistState, getPersistState } from '../../core/contexts'

const persistContext = 'authenticationContext'
const initialState = {
    state: {
        isAuthenticated: false,
    },
    setIsAuthenticated: () => {},
}

export const AuthenticationContext = createContext(initialState)

/**
 * This context will be mostly used for mobile to check if the user is authenticated or not and change the routes.
 * That's the main idea. You will see that the state is just a simple `isAuthenticated` boolean indicating wheather the
 * user is authenticated or not.
 * 
 * This persist the state in the local storage so when we open the app again we will load the data from the storage and 
 * then redirect the user to one place or another.
 */
function AuthenticationProvider(props) {
    const [state, setState] = useState(initialState.state)

    /**
     * Defines the state if the user is authenticated or not.
     * 
     * @param {boolean} isAuthenticated -  If true then the user is authenticated. Otherwise the user is not authenticated.
     */
    function setIsAuthenticated(isUserAuthenticated) {
        setPersistState(persistContext, {
            isAuthenticated: isUserAuthenticated
        }, setState)
    }

    useEffect(() => {
        //getPersistState('authenticationContext', state, setState)
    }, [])

    return (
        <AuthenticationContext.Provider 
        value={{
            state,
            setIsAuthenticated,
        }}>
            {props.children}
        </AuthenticationContext.Provider>
    )
}
GlobalProvider.registerProviders(AuthenticationProvider)

export default AuthenticationContext
export { AuthenticationProvider }