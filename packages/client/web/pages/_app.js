import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { configureConf } from '../../shared/conf'
import { Main } from '../components'
import GlobalProvider from '../../shared/core/contexts'

/**
 * This is explained better here:
 * https://fontawesome.com/v5.15/how-to-use/on-the-web/using-with/react#nextjs
 * 
 * This is a direct link to the documentation on next.js
 */
config.autoAddCss = false

configureConf({
    apiHost: 'http://localhost:4000'
})

/**
 * This will override the default app implementation of next. This was actually created by default when we created
 * this next application.
 * 
 * Reference: https://nextjs.org/docs/advanced-features/custom-app
 */
function MyApp({ Component, pageProps } = {}) {
    return (
        <GlobalProvider.Provider>
            <Main>
                <Component {...pageProps} />
            </Main>
        </GlobalProvider.Provider>
    )
}

export default MyApp
