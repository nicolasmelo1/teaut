const { settings } = require('../conf')
const makemigrations = require('../database/migrations/makemigrations')

makemigrations(settings)
