// Dispatch-offer protocol (ULTIMATE_REFINEMENT_PLAN.md §4.7), replacing
// the "broadcast to every connected socket, whoever's thumb is fastest
// wins" pattern that used to live in rideRequest.js:57. A ride is now
// offered EXCLUSIVELY to one ranked candidate at a time, with a 15s
// expiry; ride_offers_one_live_per_ride / ...per_driver (migration
// 20260728150001) make "exclusive" a database guarantee, not a hope.

const { withTransaction, query } = require('../database/db');
const { enqueueEvent } = require('../database/outbox');
const { matchH3, matchPostGIS, scoreDriver } = require('./matching');
const logger = require('./logger');

const OFFER_TTL_SECONDS = 15;

/**
 * Finds candidates (H3 first — the hot path; falls back to PostGIS if
 * Valkey has nothing, e.g. no driver has published a location there
 * yet), scores them, and creates an exclusive offer for the top-ranked
 * driver. Returns the created offer, or null if no candidates exist at
 * all (the ride stays 'requested' with no offer — a human can still see
 * it never got an automatic match and investigate).
 */
async function dispatchRide(rideId, pickupLat, pickupLng, vehicleTypeId, excludeDriverIds = []) {
    let candidates = await matchH3(pickupLat, pickupLng, vehicleTypeId, { limit: 5, excludeDriverIds });
    if (candidates.length === 0) {
        candidates = await matchPostGIS(pickupLat, pickupLng, vehicleTypeId, { limit: 5, excludeDriverIds });
    }
    if (candidates.length === 0) {
        logger.info({ rideId }, 'No candidate drivers found for dispatch');
        return null;
    }

    const ranked = candidates
        .map((c) => ({ ...c, score: scoreDriver(c) }))
        .sort((a, b) => b.score - a.score);

    return offerToCandidate(rideId, ranked, 0);
}

async function offerToCandidate(rideId, ranked, index) {
    if (index >= ranked.length) {
        logger.info({ rideId }, 'Dispatch exhausted all candidates without an acceptance');
        return null;
    }
    const candidate = ranked[index];

    try {
        return await withTransaction(async (client) => {
            const result = await client.query(
                `INSERT INTO ride_offers (ride_id, driver_id, rank, score, expires_at)
                 VALUES ($1, $2, $3, $4, now() + interval '${OFFER_TTL_SECONDS} seconds')
                 RETURNING offer_id, ride_id, driver_id, rank, expires_at`,
                [rideId, candidate.driverId, index + 1, candidate.score]
            );
            const offer = result.rows[0];

            await enqueueEvent(client, {
                aggregateType: 'ride',
                aggregateId: String(rideId),
                eventType: 'ride_offer',
                rooms: [`user_${candidate.driverId}`],
                data: { ride_id: rideId, offer_id: offer.offer_id, expires_in_seconds: OFFER_TTL_SECONDS }
            });

            return { ...offer, remainingCandidates: ranked.slice(index + 1) };
        });
    } catch (error) {
        if (error.code === '23505') {
            // ride_offers_one_live_per_driver: this candidate already has
            // a live offer for a DIFFERENT ride (a race between two
            // simultaneous dispatch runs) — skip to the next candidate
            // rather than fail the whole dispatch.
            return offerToCandidate(rideId, ranked, index + 1);
        }
        throw error;
    }
}

/**
 * Runs periodically (see startDispatchSweeper below). Expires offers past
 * their TTL and advances to the next ranked candidate — the "ranked
 * fallback" half of the protocol. Uses FOR UPDATE SKIP LOCKED so multiple
 * sweeper ticks (or, later, multiple worker processes) never double-expire
 * the same offer.
 */
async function sweepExpiredOffers() {
    const { rows: expired } = await query(`
        UPDATE ride_offers
        SET outcome = 'expired', responded_at = now()
        WHERE offer_id IN (
            SELECT offer_id FROM ride_offers
            WHERE outcome IS NULL AND expires_at < now()
            FOR UPDATE SKIP LOCKED
        )
        RETURNING ride_id, driver_id, rank
    `);

    for (const row of expired) {
        logger.info({ rideId: row.ride_id, driverId: row.driver_id, rank: row.rank }, 'Ride offer expired');

        // Re-run matching fresh rather than reusing the original ranked
        // list — a driver who was candidate #2 fifteen seconds ago may
        // have moved or gone offline since.
        const ride = await query('SELECT pickup_latitude, pickup_longitude, vehicle_type_id, ride_status FROM rides WHERE ride_id = $1', [row.ride_id]);
        if (ride.rows.length === 0 || ride.rows[0].ride_status !== 'requested') continue;

        // Exclude every driver already offered this ride (any outcome) —
        // otherwise re-running matching fresh just re-ranks the SAME
        // closest driver back to #1 and re-offers them the ride they
        // just missed, which isn't a fallback at all. Real production
        // dispatch (Uber/Grab) works the same way: an expired/declined
        // offer removes that driver from consideration for this
        // specific ride, not just from this one attempt.
        const priorOffers = await query('SELECT driver_id FROM ride_offers WHERE ride_id = $1', [row.ride_id]);
        const excludeDriverIds = priorOffers.rows.map((r) => r.driver_id);

        const r = ride.rows[0];
        await dispatchRide(row.ride_id, Number(r.pickup_latitude), Number(r.pickup_longitude), r.vehicle_type_id, excludeDriverIds);
    }
}

let sweeperTimer = null;
function startDispatchSweeper(intervalMs = 5000) {
    if (sweeperTimer) return;
    sweeperTimer = setInterval(() => {
        sweepExpiredOffers().catch((err) => logger.error({ err }, 'Dispatch sweeper tick failed'));
    }, intervalMs);
    sweeperTimer.unref();
    logger.info({ intervalMs }, 'Dispatch sweeper started');
}
function stopDispatchSweeper() {
    if (sweeperTimer) clearInterval(sweeperTimer);
    sweeperTimer = null;
}

module.exports = { dispatchRide, sweepExpiredOffers, startDispatchSweeper, stopDispatchSweeper };
