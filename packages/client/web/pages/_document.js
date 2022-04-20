import Document, { Html, Head, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

/**
 * This is a custom document of the app. Instead of defining the document as a normal html we need
 * to use this in order to work.
 * 
 * Right now this is used to add the styles and enable server side rendering in the platform with styled
 * components.
 * 
 * Reference:
 * #1: https://github.com/vercel/next.js/tree/canary/examples/with-styled-components
 * #2: https://nextjs.org/docs/advanced-features/custom-document
 * #3: https://nextjs.org/docs/advanced-features/custom-document#customizing-renderpage
 */
export default class MyDocument extends Document {
    static async getInitialProps(ctx) {
        const sheet = new ServerStyleSheet()
        const originalRenderPage = ctx.renderPage

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                enhanceApp: (App) => (props) =>
                    sheet.collectStyles(<App {...props} />),
                })

            const initialProps = await Document.getInitialProps(ctx)
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                ),
            }
        } finally {
            sheet.seal()
        }
    }

    render() {
        return (
            <Html lang={'pt-BR'}>
                <Head />
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
