import { createContext, useState, useEffect } from 'react'
import GlobalProvider, { setPersistState, getPersistState } from '../../core/contexts'

const persistContext = 'userContext'
const initialState = {
    state: {
        id: null,
        dateJoined: null,
        firstName: '',
        lastName: '',
        email: '',
        lastLogin: null,
        username: '',
        /** @type {{ uuid: string, profileTypeId: number, name: string, logoImageUrl: string, endpoint: string, createdAt: string}} */
        workspaces: []
    },
    setUser: () => {},
}

export const UserContext = createContext(initialState)

/**
 * This is responsible for getting and setting the user data inside of the application. The user data retrieved are stuff like
 * the user name, the user id, as well as more complex stuff like the user's workspaces and each profile that he has for each
 * workspaces he has access to.
 */
function UserProvider(props) {
    const [state, _setState] = useState(initialState.state)

    function setState(value) {
        setPersistState(persistContext, value)
        _setState(value)
    }   

    function setUser({ id, dateJoined, firstName, lastName, email, lastLogin, username, workspaces } = {}) {
        setState({
            id,
            dateJoined,
            firstName,
            lastName,
            email,
            lastLogin,
            username,
            workspaces
        })
    }

    useEffect(() => {
        getPersistState(persistContext, state, _setState)
    }, [])

    return (
        <UserContext.Provider value={{
            user: state,
            setUser,
        }}>
            {props.children}
        </UserContext.Provider>
    )
}

GlobalProvider.registerProviders(UserProvider)

export default UserContext
export { UserProvider }