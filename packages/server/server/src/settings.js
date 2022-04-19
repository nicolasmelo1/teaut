const path = require('path')

const ENV = ![null, undefined, ''].includes(process.env.NODE_ENV) ? process.env.NODE_ENV : 'development'
const DEBUG = true
const PORT = 4000
const SECRET_KEY = 'teste'
const APP_NAME = 'reflow_server'

const BASE_PATH = path.dirname(path.resolve(__dirname))

const ROOT_URLCONF = BASE_PATH + '/src/routes'

const INSTALLED_APPS = [
    path.join('src', 'core'),
    path.join('src', 'authentication'),
    path.join('src', 'area'),
    path.join('src', 'app_management_formulary'),
    path.join('src', 'draft')
]

const WEBSOCKETS = {
    ROOT_URLCONF: BASE_PATH + '/src/routing',
    LAYER: {
        BACKEND: 'inMemory',
    }
}

const MIDDLEWARE = [
    require('./core/middlewares').corsMiddleware(),
    require('compression')(),
    require('express').json(),
    require('express').urlencoded({extended: false}),
    require('./core/middlewares').snakeToCamelCaseQueryParams(),
    require('./core/middlewares').retrieveUsersPreferredLanguage(),
    require('helmet')(),
    require('./core/middlewares').poweredByReflowMiddleware(),
]

const DATABASE = {   
    engine: 'postgres',
    databaseName: 'postgres',
    username: 'postgres', 
    password: '',
    host: 'localhost',
    port: 5435,
    extraOptions: {
        logging: false,
        query: { 
            raw: true
        }
    }
}


// Teaut configurations, configurations specific for Teaut project

// CUSTOM PERMISSIONS CONFIGURATION
// check src/core/permissions file for reference
const PERMISSIONS = {
    DEFAULT: [
        'src/authentication/permissions/AuthenticationDefaultPermission'
    ]
}

// DATE FIELD CONFIGURATION
// check ./src/formulary/models/FieldDateFormatType
/*
Dates are saved in this default format, this way it becomes easier to work with it regardless
the location the user is accessing
*/
const DEFAULT_PSQL_DATE_FIELD_FORMAT = 'YYYY-MM-DD HH24:MI:SS'
const DEFAULT_DATE_FIELD_FORMAT = 'YYYY-MM-DD HH:mm:ss'

// NUMBER FIELD CONFIGURATION
// check ./src/formulary/models/FieldNumberFormatType
/*
Numbers are saved as `INTEGERs` in our DB since it's very difficult to work
with float values in computing, with this, we define a BASE NUMBER, so every integer saved
is multiplied by it, and every decimal is saved following the rule FLOATNUMBER * (BASE/PRECISION)
*/
const DEFAULT_BASE_NUMBER_FIELD_FORMAT = 100000000

// DEVELOPMENT LOCALSTACK CONFIGURATION
const LOCALSTACK_ENDPOINT = 'localhost.localstack.cloud'
const LOCALSTACK_PORT = 4566

// CUSTOM JWT CONFIGURATION
// check authentication/utils/jwtAuth file
const JWT_ENCODING = 'HS256'
const JWT_HEADER_TYPES = ['Client']

module.exports = {
    ENV,
    PERMISSIONS,
    EVENTS,
    DEBUG,
    PORT,
    BASE_PATH,
    MIDDLEWARE,
    APP_NAME,
    SECRET_KEY,
    ROOT_URLCONF,
    INSTALLED_APPS,
    DATABASE,
    DEFAULT_PSQL_DATE_FIELD_FORMAT,
    DEFAULT_DATE_FIELD_FORMAT,
    DEFAULT_BASE_NUMBER_FIELD_FORMAT,
    LOCALSTACK_ENDPOINT,
    LOCALSTACK_PORT,
    JWT_ENCODING,
    JWT_HEADER_TYPES,
    WEBSOCKETS,
}