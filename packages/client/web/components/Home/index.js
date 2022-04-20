import Head from '../Head'
import { Layout, RichText } from '../../../shared'

export default function Home(props) {
    return (
        <Layout>
            <Head
            title={'Home'}
            />
            <h1>
                Home
            </h1>
            <RichText/>
        </Layout>
    )
}