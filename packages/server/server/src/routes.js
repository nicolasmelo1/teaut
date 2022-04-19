const { path } = require('../../palmares/routers')

const routes = [
    path('/core', require('./core/routes')),
    path('/area', require('./area/routes')),
    path('/authentication', require('./authentication/routes')),
    path('/app/:workspaceUUID', [
        path('/management/:appUUID/formulary', require('./app_management_formulary/routes')),
    ]),
    path('/draft/:workspaceUUID', require('./draft/routes'))
]

module.exports = routes