class DenyConnection extends Error {
    constructor(message) {
        super(message);
        this.name = 'DenyConnection'
    }
}

module.exports = { 
    DenyConnection 
}