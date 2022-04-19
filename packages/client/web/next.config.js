const path = require('path')

const nextConfig = {
    reactStrictMode: true,
    env: {
        APP: 'web'
    },
    compiler: {
        styledComponents: true
    },
    webpack: (config, { defaultLoaders }) => { 
        config.resolve = {
            ...config.resolve,
            alias: {
                ...config.resolve.alias,
                '@fortawesome/react-native-fontawesome': '@fortawesome/react-fontawesome',
                './dynamicImport.mobile': './dynamicImport.web',
                "react-native": path.join(__dirname, 'node_modules', 'react-native-web'),
                './mobile': './web'
            },
            // So what we were doing before was:
            // modules: [...config.resolve.modules, path.resolve(__dirname, 'node_modules')],
            // The problem is that this config will translate to:
            // modules: ['nome_modules', '/Users/nicolasmelo/workspace/reflow_monorepo/packages/client/web/node_modules'] (the second path was generated
            // from my computer)
            // So what we are doing is that we are considering the root 'node_modules' folder, so the root folder where `turbo` is installed. This will give us
            // conflicting issues with the react installed in this folder. So by that we will get the https://reactjs.org/warnings/invalid-hook-call-warning.html
            // saying that we are not using hooks in a function component. So this error will happen because of item 1 (You might have mismatching versions of React and React DOM.)
            // To solve this issue what we need to do is ignore the root node_modules folder and just consider this project's node_modules folder.
            modules: [
                path.resolve(__dirname, 'node_modules'),
                path.resolve(__dirname, '..', '..', 'shared', 'node_modules'),
            ],
            symlinks: false,
        }

        config.module.rules.push({
            use: defaultLoaders.babel,
            include: [
                path.resolve(__dirname, '..', 'shared')
            ],
        })
        
        return config
    },
}

module.exports = nextConfig
