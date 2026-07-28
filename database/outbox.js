// The transactional outbox pattern (ULTIMATE_REFINEMENT_PLAN.md §4.6),
// fixing P1-8: today, controllers call global.io.emit(...) AFTER a
// query() write returns, completely outside any transaction — if a
// LATER statement in the same request fails and rolls back, the client
// has already been told the write succeeded. There is no un-emit.
//
// The fix: write the event to a table INSIDE the same transaction as the
// state change. Now the event and the data share one commit — atomic by
// construction. A separate relay (backend/outboxRelay.js) publishes
// afterward, on its own schedule, from committed data only.
//
// Deliberately dumb by design: this module doesn't know what a "ride" or
// a "room" is. The caller (which already has full context — who needs to
// know about this event, and what they should be told) decides `rooms`
// and `data`; enqueueEvent just persists it durably. That keeps the
// business logic where it already lives (the controllers) and keeps the
// relay a trivial, generic executor — see outboxRelay.js.

/**
 * @param {import('pg').PoolClient} client - MUST be the same client the
 *   caller's withTransaction() callback received, so this insert commits
 *   or rolls back atomically with everything else in the request.
 * @param {{
 *   aggregateType: string,   // e.g. 'ride', 'payment' — what this event is about
 *   aggregateId: string,     // e.g. the ride_id, as a string
 *   eventType: string,       // doubles as the Socket.IO event name emitted to clients
 *   rooms: string[],         // Socket.IO room names to emit to
 *   data: object             // the payload clients receive
 * }} event
 */
async function enqueueEvent(client, { aggregateType, aggregateId, eventType, rooms, data }) {
    await client.query(
        `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        [aggregateType, aggregateId, eventType, JSON.stringify({ rooms, data })]
    );
}

module.exports = { enqueueEvent };
