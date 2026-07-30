// Fixes P1-1: passwords were hashed with a single round of unsalted
// SHA-256 (crypto.createHash('sha256')) — a message digest function,
// engineered to be FAST, which is exactly the wrong property for
// password storage. No salt meant identical passwords produced
// identical hashes, so one rainbow table broke every user sharing a
// password at once. Argon2id is a memory-hard KDF, the current OWASP
// recommendation, with a per-hash random salt built in automatically.
//
// verifyPassword transparently upgrades a legacy SHA-256 hash to
// Argon2id the moment a user successfully logs in — no forced password
// reset, no disruption, the migration just happens as users authenticate
// normally. A legacy hash is recognizable by shape: SHA-256 hex digests
// are exactly 64 lowercase hex characters; Argon2id hashes always start
// with the literal prefix $argon2id$.

const crypto = require('crypto');
const argon2 = require('@node-rs/argon2');

const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/;

function isLegacyHash(hash) {
    return LEGACY_SHA256_PATTERN.test(hash);
}

function legacySha256(plaintext) {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
}

async function hashPassword(plaintext) {
    return argon2.hash(plaintext);
}

/**
 * @returns {Promise<{ valid: boolean, needsRehash: boolean }>}
 */
async function verifyPassword(plaintext, storedHash) {
    if (isLegacyHash(storedHash)) {
        const valid = legacySha256(plaintext) === storedHash;
        return { valid, needsRehash: valid }; // upgrade on next successful login
    }
    const valid = await argon2.verify(storedHash, plaintext);
    return { valid, needsRehash: false };
}

module.exports = { hashPassword, verifyPassword, isLegacyHash };
