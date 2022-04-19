const controllers = require('../../../palmares/controllers')
const status = require('../../../palmares/status')

const {validatePermissionsFromRequest} = require('../core/permissions')
const { UserConsumer } = require('./consumers')

/**
 * Simple healthcheck to check if the application is up and running or not.
 */
class HealthCheckController extends controllers.Controller {
    /**
     * Retrieves a json if the application is up and running. 
     */

    async get(req, res, next) { 
        UserConsumer.send('verifyIfNeedToDisplaySurvey', 1, { hello: 'world'})
        res.status(status.HTTP_200_OK).json({
            status: 'ok'
        })
    }
}

class TestPermissionsController extends controllers.Controller {
    async get(req, res, next) {
        await validatePermissionsFromRequest(req, 'DEFAULT')
        res.status(status.HTTP_200_OK).json({
            status: 'ok'
        })
    }
}

module.exports = {
    HealthCheckController,
    TestPermissionsController
}

