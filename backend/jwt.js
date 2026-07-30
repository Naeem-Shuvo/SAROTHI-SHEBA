// Every signed token gets a unique jti (JWT ID) — the handle
// tokenRevocation.js uses to revoke one specific token without needing
// to store the full token string anywhere.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('./config');

function signToken(payload, options = {}) {
    return jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.JWT_SECRET, options);
}

function verifyToken(token) {
    return jwt.verify(token, config.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
