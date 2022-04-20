import Head from 'next/head'

/**
 * This is the actual <head> html tag from the next.js aplication.
 * 
 * So if you want to add some custom meta tags, custom scripts, or whatever you can
 * add everything here.
 * 
 * @param {object} props - This is all of the props that you can pass to this component.
 * @param {string} props.title - The title of the page.
 * 
 * @returns {import('react').ReactElement} - Returns a React element.
 */
export default function Header(props) {
    return (
        <Head>
            <title>{ props.title }</title>
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="white"/>
            <meta name="viewport" content="initial-scale=1.0, width=device-width, viewport-fit=cover"/>
            <meta name="name" content="Teaut"/>
            <meta name="description" content="The easiest way to start automating"/>
            <meta charSet="utf-8" />
            <link rel="shortcut icon" href="/favicon.ico"/>
            <link rel="stylesheet" href="/font/roboto/index.css" />
        </Head>
    )
}