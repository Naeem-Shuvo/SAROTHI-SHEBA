// Publishes committed outbox rows (database/outbox.js) as Socket.IO
// events. Runs as a polling loop in the same process as the API server
// for now — Phase 6 moves this to a real Redpanda-backed relay and adds
// independent consumers; the FOR UPDATE SKIP LOCKED claim below is
// already written so that multiple relay instances can run concurrently
// without colliding, which is what makes that move possible later
// without touching this logic.
//
// At-least-once delivery, not exactly-once: if the process crashes
// between marking published_at and... actually the UPDATE and the emit
// happen in the opposite, safer order here — see the comment below on
// why emit-then-mark (not mark-then-emit) is the right choice even
// though it can occasionally double-emit on a crash. Socket.IO delivery
// has no idempotency story on the client today (Phase 8 territory), so
// this is a deliberate, honest tradeoff: rare duplicate UI refresh vs.
// rare silently dropped event. A dropped event is worse.

const { pool } = require('../database/db');
const logger = require('./logger');

const POLL_INTERVAL_MS = 250;
const BATCH_SIZE = 50;

let timer = null;
let running = false;

async function relayOnce(io) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(`
            SELECT id, event_type, payload
            FROM outbox
            WHERE published_at IS NULL
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT $1
        `, [BATCH_SIZE]);

        for (const row of rows) {
            const { rooms = [], data = {} } = row.payload || {};
            for (const room of rooms) {
                io.to(room).emit(row.event_type, data);
            }
            // Marked published INSIDE the same transaction that claimed
            // the row via SKIP LOCKED — if the process dies mid-batch,
            // an un-marked row is simply picked up again next tick. The
            // emit above already happened by then in the crashed run,
            // so a crash here can cause an at-most-one duplicate emit,
            // never a lost one.
            await client.query('UPDATE outbox SET published_at = now() WHERE id = $1', [row.id]);
        }

        await client.query('COMMIT');

        if (rows.length > 0) {
            logger.debug({ count: rows.length }, 'Outbox relay published events');
        }
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        logger.error({ err: error }, 'Outbox relay batch failed');
    } finally {
        client.release();
    }
}

function startOutboxRelay(io) {
    if (timer) return;
    timer = setInterval(async () => {
        if (running) return; // don't overlap ticks if a batch is slow
        running = true;
        try {
            await relayOnce(io);
        } finally {
            running = false;
        }
    }, POLL_INTERVAL_MS);
    timer.unref(); // don't keep the process alive on its own
    logger.info({ intervalMs: POLL_INTERVAL_MS }, 'Outbox relay started');
}

function stopOutboxRelay() {
    if (timer) clearInterval(timer);
    timer = null;
}

module.exports = { startOutboxRelay, stopOutboxRelay, relayOnce };
