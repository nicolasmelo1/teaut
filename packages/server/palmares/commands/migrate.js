const { settings } = require('../conf')
const migrate = require('../database/migrations/migrate')

Promise.resolve(migrate(settings))