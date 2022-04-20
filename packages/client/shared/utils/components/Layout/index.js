import { useEffect, useContext } from 'react'
import { ThemeProvider } from 'styled-components'
import themes from '../../../core/utils/themes'
import { paths } from '../../../core/utils/constants'
import { exceptionObserver as agentExceptionObserver, getRefreshToken, setTokens } from '../../../core/agent/utils'
import { useRouterOrNavigationRedirect } from '../../../core/hooks'
import { AuthenticationContext } from '../../../authentication/contexts'
import utilsAgent from '../../agent'
import { default as RenderLayout } from './layouts'

/**
 * This is the main component of the page, we use this custom layout component so pages can override from this.
 * IMPORTANT: When you create a new Page, PLEASE use this component as the first tag of your page.
 * 
 * @param {object} props - This is all of the props that you can pass to this component.
 * 
 * @returns {import('React').Component} - Returns a React component. Can be either a mobile component or a web component.
 */
export default function Layout(props) {
    const { setIsAuthenticated } = useContext(AuthenticationContext) 
    const redirect = useRouterOrNavigationRedirect()

    /**
     * This will redirect the user back to the login page so he needs to make the login again inside of the application.
     */
    function redirectToLogin() {
        redirect(paths.login.asUrl)
    }

    /**
     * This will get the refresh token from the local storage or from the async storage, request for new tokens and after that
     * we will make the request again with the new tokens by calling the `makeRequestAgain` function.
     * 
     * @param {string} reason - The error recieved from the backend.
     * @param {function} makeRequestAgain - A function to be called to make the request again so we can get the response
     * of the request without issues when refreshing the new token.
     */
    async function handleRefreshToken(reason, makeRequestAgain) {
        let isToRedirectUserToLogin = true
        if (reason === 'expired_token') {
            const refreshToken = await getRefreshToken()
            const response = await utilsAgent.refreshToken(refreshToken)
            if (response && response.status === 200) {
                const accessToken = response.data.data.accessToken
                const refreshToken = response.data.data.refreshToken
                isToRedirectUserToLogin = false
                await setTokens(accessToken, refreshToken)
                makeRequestAgain()
            }
        }
        if (isToRedirectUserToLogin) {
            setIsAuthenticated(false)
            redirectToLogin()
        }
    }

    /**
     * This will handle when the user is unauthenticated inside of teaut. When this happens what we do is that we 
     * will try to get the refresh token ant then we will try to make the request again, if not possible we will redirect
     * the user to the login page.
     * 
     * @param {import('axios').Response} response - This is the response from axios so we can send the request again.
     * @param {function} makeRequestAgain - This is the function that will be called to make the request again when all of the handlers
     * have been fired. This will guarantee that however is making the request will be able to 
     */
    async function handleUnauthenticated(response, makeRequestAgain) {
        if (response && response?.data?.error?.reason && ['invalid_token', 'login_required', 'expired_token'].includes(response.data.error.reason)) {
            await handleRefreshToken(response.data.error.reason, makeRequestAgain)
        }
    }

    useEffect(() => {
        agentExceptionObserver.addCallback(handleUnauthenticated)
    }, [])

    return (
        <ThemeProvider theme={themes.default}>
            <RenderLayout
            children={props.children}
            />
        </ThemeProvider>
    )
}
