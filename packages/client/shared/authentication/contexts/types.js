import { createContext, useState } from 'react'
import GlobalProvider, { setPersistState, getPersistState } from '../../core/contexts'

const persistContext = 'authenticationTypesContext'
const initialState = {
    state: {
        types: {
            profileType: [],
            locationType: []
        }
    },
    setTypes: () => {},
    retrieveFromPersist: () => {}
}

const AuthenticationTypesContext = createContext(initialState)

function AuthenticationTypesProvider(props) {
    const [state, setState] = useState(initialState.state)

    function setTypes(profileTypes, locationTypes) {
        setPersistState(persistContext, {
            types: {
                profileType: profileTypes,
                locationType: locationTypes
            }
        }, setState)
    }

    function retrieveFromPersist() {
        getPersistState(persistContext, initialState, setState)
    }

    return (
        <AuthenticationTypesContext.Provider value={{
            state,
            setTypes,
            retrieveFromPersist
        }}
        >
            {props.children}
        </AuthenticationTypesContext.Provider>
    )
}

GlobalProvider.registerProviders(AuthenticationTypesProvider)

export default AuthenticationTypesContext
export { AuthenticationTypesProvider }