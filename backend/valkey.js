// Shared Valkey (Redis-protocol) connection. Valkey chosen over Redis 8
// for licensing (BSD-3 vs AGPLv3) — see
// ULTIMATE_REFINEMENT_PLAN.md §3 Layer 4. ioredis works against it
// unmodified since Valkey is wire-compatible with the Redis protocol.
//
// First real consumer: the H3 hot geo index (backend/matching.js).
// Deliberately NOT wired in Phase 3 — nothing needed cross-system
// coordination until now; adding it earlier would have been unused
// scaffolding.

const Redis = require('ioredis');
const config = require('./config');
const logger = require('./logger');

const valkey = new Redis({
    host: config.VALKEY_HOST,
    port: config.VALKEY_PORT,
    // Fail fast in scripts/tests rather than retrying forever against a
    // Valkey that will never come up; the app itself reconnects fine
    // because ioredis keeps retrying with backoff by default.
    lazyConnect: false
});

valkey.on('error', (err) => {
    logger.error({ err }, 'Valkey connection error');
});

module.exports = valkey;
