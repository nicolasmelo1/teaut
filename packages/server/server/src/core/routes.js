const { path } = require('../../../palmares/routers')

const { 
    HealthCheckController,
    TestPermissionsController
} = require('./controllers')

const routes = [
    path('/healthcheck', HealthCheckController.asController()),
    path('/test_permissions', TestPermissionsController.asController())
]

module.exports = routes