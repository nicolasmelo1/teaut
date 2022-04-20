import { createContext, useState, useEffect } from 'react'
import GlobalProvider, { setPersistState, getPersistState } from '../../core/contexts'

const persistContext = 'workspaceContext'
const initialState = {
    state: {
        selectedWorkspace: { 
            uuid: null, 
            profileTypeId: null, 
            isAdmin: true,
            name: '', 
            logoImageUrl: '', 
            endpoint: '', 
            createdAt: new Date()
        }
    },
    setSelectedWorkspace: () => {}
}

/**
 * Context responsible for managing the selected workspace, on here we will define the profile of the user inside of this
 * workspace, the profile type, the logo and all of that stuff.
 * 
 * Also, it's important to understand that this Workspace is the same as the `Company` where the user is in. Suppose an account
 * and this account has access to multiple workspaces. The user will be able to switch between them, and this will hold the workspace 
 * he will be in at the current time.
 * 
 * @returns {import('react').Context} - The context that will be used to manage the selected workspace.
 */
const WorkspaceContext = createContext(initialState)

function WorkspaceProvider(props) {
    const [state, setState] = useState(initialState.state)

    function setSelectedWorkspace(uuid, profileTypeId, isAdmin, name, logoImageUrl, endpoint, createdAt) {
        setPersistState(persistContext, {
            selectedWorkspace: {
                uuid,
                profileTypeId,
                isAdmin,
                name,
                logoImageUrl,
                endpoint,
                createdAt
            }
        }, setState)
    }

    useEffect(() => {
        getPersistState(persistContext, state, setState)
    }, [])

    return (
        <WorkspaceContext.Provider 
        value={{
            state,
            setSelectedWorkspace
        }}
        >
            {props.children}
        </WorkspaceContext.Provider>
    )
}

GlobalProvider.registerProviders(WorkspaceProvider)

export default WorkspaceContext
export { WorkspaceProvider }