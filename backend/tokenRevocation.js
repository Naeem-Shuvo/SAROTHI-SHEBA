// Fixes P1-14: the old blacklist (backend/middleware/tokenBlacklist.js)
// was an in-process Map — a restart forgets every logged-out token, and
// it's invisible across multiple Node processes entirely. Valkey makes
// revocation durable and shared. Keyed by jti (a per-token random id,
// see backend/jwt.js), not the raw token string — smaller keys, and
// nothing sensitive stored.

const valkey = require('./valkey');

async function revokeToken(jti, exp) {
    if (!jti) return;
    // exp is a JWT NumericDate (seconds since epoch). TTL the Valkey key
    // to match the token's own remaining lifetime — once the token would
    // have expired naturally anyway, there's nothing left to revoke.
    const ttlSeconds = typeof exp === 'number'
        ? Math.max(1, exp - Math.floor(Date.now() / 1000))
        : 60 * 60; // fallback: 1h, if exp was somehow missing
    await valkey.set(`revoked:jti:${jti}`, '1', 'EX', ttlSeconds);
}

async function isTokenRevoked(jti) {
    if (!jti) return false;
    return (await valkey.exists(`revoked:jti:${jti}`)) === 1;
}

module.exports = { revokeToken, isTokenRevoked };
