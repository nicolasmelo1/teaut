const { ValidationError } = require('../../../palmares/serializers')

class ReflowValidationError extends ValidationError {
    constructor ({reason='', detail='', metadata={}} = {}) {
        super({reason: reason, detail: detail, metadata: metadata})
    }
}


module.exports = { 
    ReflowValidationError
}