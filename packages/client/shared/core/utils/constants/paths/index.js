const paths = {
    login: {
        asUrl: '/login',
        webOnly: false,
        mobileOnly: false,
        adminOnly: false,
        loginOnly: false,
    },
    workspace: {
        asUrl: '/{workspaceUUID}',
        webOnly: false,
        mobileOnly: false,
        adminOnly: false,
        loginOnly: true,
    },
    app: {
        asUrl: '/{workspaceUUID}/{appUUID}',
        webOnly: false,
        mobileOnly: false,
        adminOnly: false,
        loginOnly: true,
    }
}

export default paths