const multer = require('multer')
const storage = multer.diskStorage({})

/**
 * We use multer middleware to upload files from the client to the server.
 * 
 * You can find a better reference and documentation below.
 * Reference: https://www.npmjs.com/package/multer
 */
module.exports = multer({storage: storage})