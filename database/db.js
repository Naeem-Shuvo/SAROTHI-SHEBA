const { Pool } = require('pg');
const config = require('../backend/config');

// config.js validates the whole environment (including PG_*) in one pass
// and exits with a clear aggregated error if anything is missing — see
// backend/config.js. Requiring it here means importing db.js from ANY
// entry point (the server, a migration script, the seed script) gets the
// same fail-fast guarantee for free.
const pool = new Pool({
    host: config.PG_HOST,
    port: config.PG_PORT,
    database: config.PG_DATABASE,
    user: config.PG_USER,
    password: config.PG_PASSWORD
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});

async function testConnection() {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
        console.log('Database connected successfully');
    } finally {
        client.release();
    }
}

// Unchanged from before Phase 1. Still used by all 16 controllers.
// Its limitation is real (see ULTIMATE_REFINEMENT_PLAN.md §1.5 P1-6: wrapping
// a SINGLE statement in BEGIN/COMMIT buys nothing, and makes MULTI-statement
// atomicity impossible) but fixing that means migrating call sites onto
// withTransaction() below, which is Phase 3's job, not Phase 1's. This
// function stays exactly as it was so nothing that already works breaks.
async function query(text, params) {
    const sql = (text || '').trim().toUpperCase();
    const isDml = /^(INSERT|UPDATE|DELETE|CALL)\b/.test(sql);

    if (!isDml) {
        return pool.query(text, params);
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(text, params);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError.message);
        }
        throw error;
    } finally {
        client.release();
    }
}

const SERIALIZATION_FAILURE = '40001';
const DEADLOCK_DETECTED = '40P01';

/**
 * Runs `fn` inside ONE transaction on ONE client — the primitive `query()`
 * cannot provide, because query() takes a fresh connection and commits on
 * every call. Retries automatically on serialization failure / deadlock
 * with jittered backoff.
 *
 * See ULTIMATE_REFINEMENT_PLAN.md §4.1 for the full explanation of why the
 * retry loop is mandatory (not defensive) once SERIALIZABLE is in use, and
 * why the backoff must be jittered rather than fixed exponential.
 *
 * Introduced in Phase 1 as a standalone, tested primitive. Controllers
 * don't call it yet — that migration is Phase 3's job (see P1-6, P1-7,
 * P1-8 in the plan). Phase 1's exit criterion is just that this function
 * itself is correct: prove it rolls back everything when the callback
 * throws, and that it actually retries under real contention.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @param {{
 *   isolation?: 'READ COMMITTED'|'REPEATABLE READ'|'SERIALIZABLE',
 *   readOnly?: boolean,
 *   maxRetries?: number,
 *   actorId?: number
 * }} [opts]
 * @returns {Promise<T>}
 */
async function withTransaction(fn, opts = {}) {
    const {
        isolation = 'READ COMMITTED',
        readOnly = false,
        maxRetries = 3,
        actorId = null
    } = opts;

    for (let attempt = 0; ; attempt++) {
        const client = await pool.connect();
        try {
            await client.query(
                `BEGIN ISOLATION LEVEL ${isolation}${readOnly ? ' READ ONLY' : ''}`
            );

            // LOCAL scope (third arg = true): the setting reverts at
            // COMMIT/ROLLBACK. Critical with a connection pool — the next
            // request to borrow this connection must not inherit this
            // request's identity. Not used by anything yet (RLS lands in
            // Phase 5) but the transaction boundary is exactly where it
            // has to be set, so it's wired in now rather than retrofitted.
            if (actorId != null) {
                await client.query('SELECT set_config($1, $2, true)', [
                    'app.current_user_id',
                    String(actorId)
                ]);
            }

            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});

            const retryable =
                error.code === SERIALIZATION_FAILURE || error.code === DEADLOCK_DETECTED;
            if (retryable && attempt < maxRetries) {
                // Full jitter. Fixed exponential backoff makes contending
                // transactions collide again on every retry, in lockstep —
                // the randomness is the entire point.
                const backoffMs = Math.random() * 2 ** attempt * 25;
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                continue;
            }
            throw error;
        } finally {
            client.release();
        }
    }
}

function closePool() {
    return pool.end();
}

module.exports = {
    pool,
    testConnection,
    query,
    withTransaction,
    closePool
};
