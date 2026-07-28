// The matching engine §1.6 found completely missing: rideRequest.js used
// to global.io.emit('new_ride_request') to literally every connected
// socket, and availableRides.js returned every open request nationwide
// with no distance filter. This replaces that with real proximity-based
// candidate selection.
//
// Two independent matchers, built deliberately in parallel rather than
// picking one on faith (ULTIMATE_REFINEMENT_PLAN.md §4.7):
//   - matchPostGIS: ST_DWithin + KNN against driver_locations. Simple,
//     transactional, exact distances.
//   - matchH3: H3 k-ring lookup against a Valkey hot index. What Uber
//     and Grab actually use for sub-100ms dispatch at scale.
// benchmark.js measures both under load so the tradeoff is a number, not
// an opinion — see progress.md for the results.

const { latLngToCell, gridDisk } = require('h3-js');
const { query } = require('../database/db');
const valkey = require('./valkey');

const H3_RESOLUTION = 8; // ~0.74 km^2 per cell — the urban default (§4.7)

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Called whenever a driver's position updates. Writes to BOTH stores:
 * driver_locations (PostGIS, durable, exact) and Valkey (hot, H3-keyed,
 * ephemeral — losing this on a crash costs one heartbeat interval, which
 * is the entire justification for UNLOGGED + an in-memory store; see
 * §4.7's read/write asymmetry argument).
 */
async function updateDriverLocation(driverId, lat, lng, isAvailable = true) {
    const cell = latLngToCell(lat, lng, H3_RESOLUTION);
    const cellDecimal = BigInt('0x' + cell).toString(); // h3-js gives hex strings; store as a plain number

    await query(
        `INSERT INTO driver_locations (driver_id, geog, h3_r8, is_available, updated_at)
         VALUES ($1, geography(ST_SetSRID(ST_MakePoint($2, $3), 4326)), $4, $5, now())
         ON CONFLICT (driver_id) DO UPDATE
            SET geog = EXCLUDED.geog, h3_r8 = EXCLUDED.h3_r8,
                is_available = EXCLUDED.is_available, updated_at = now()`,
        [driverId, lng, lat, cellDecimal, isAvailable]
    );

    const prevCell = await valkey.hget(`driver:loc:${driverId}`, 'cell');
    const pipeline = valkey.multi();
    if (prevCell && prevCell !== cell) {
        pipeline.srem(`drivers:cell:${prevCell}`, String(driverId));
    }
    if (isAvailable) {
        pipeline.sadd(`drivers:cell:${cell}`, String(driverId));
    } else {
        pipeline.srem(`drivers:cell:${cell}`, String(driverId));
    }
    pipeline.hset(`driver:loc:${driverId}`, { lat, lng, cell, isAvailable: isAvailable ? '1' : '0', updatedAt: Date.now() });
    // 30s heartbeat TTL on the hash — a driver who stops pinging silently
    // ages out of "available" rather than being matched forever.
    pipeline.expire(`driver:loc:${driverId}`, 30);
    await pipeline.exec();
}

/**
 * PostGIS-only matcher. ST_DWithin narrows to the search radius (uses the
 * GiST index — migration 20260728130004); the <-> operator does an
 * index-assisted KNN ordering on top.
 */
async function matchPostGIS(pickupLat, pickupLng, vehicleTypeId, { limit = 10, radiusMeters = 5000, excludeDriverIds = [] } = {}) {
    const { rows } = await query(
        `SELECT dl.driver_id, d.rating_average,
                ST_Distance(dl.geog, geography(ST_SetSRID(ST_MakePoint($1, $2), 4326))) AS distance_m
         FROM driver_locations dl
         JOIN drivers d ON d.user_id = dl.driver_id
         JOIN vehicles v ON v.driver_id = dl.driver_id AND v.vehicle_type_id = $3
         WHERE dl.is_available = TRUE
           AND NOT (dl.driver_id = ANY($6::int[]))
           AND ST_DWithin(dl.geog, geography(ST_SetSRID(ST_MakePoint($1, $2), 4326)), $4)
         ORDER BY dl.geog <-> geography(ST_SetSRID(ST_MakePoint($1, $2), 4326))
         LIMIT $5`,
        [pickupLng, pickupLat, vehicleTypeId, radiusMeters, limit, excludeDriverIds]
    );
    return rows.map((r) => ({ driverId: r.driver_id, ratingAverage: r.rating_average, distanceKm: r.distance_m / 1000 }));
}

/**
 * H3 + Valkey matcher. Looks at the origin cell's k-ring (7 cells at k=1),
 * widening to k=2 (19 cells) if too thin — exactly the pattern §4.7
 * documents Uber/Grab using for sub-100ms dispatch.
 */
async function matchH3(pickupLat, pickupLng, vehicleTypeId, { limit = 10, excludeDriverIds = [] } = {}) {
    const origin = latLngToCell(pickupLat, pickupLng, H3_RESOLUTION);
    const excluded = new Set(excludeDriverIds.map(String));

    let candidateIds = [];
    let ring = 1;
    while (candidateIds.length < limit && ring <= 3) {
        const cells = gridDisk(origin, ring);
        const keys = cells.map((c) => `drivers:cell:${c}`);
        candidateIds = keys.length ? await valkey.sunion(...keys) : [];
        candidateIds = candidateIds.filter((id) => !excluded.has(id));
        ring++;
    }
    if (candidateIds.length === 0) return [];

    // Enrich from Postgres: vehicle type filter + rating. Exact distance
    // for ranking comes from the Valkey hash (haversine), not another
    // PostGIS round trip — that's the whole point of the hot path.
    const { rows } = await query(
        `SELECT d.user_id AS driver_id, d.rating_average
         FROM drivers d
         JOIN vehicles v ON v.driver_id = d.user_id AND v.vehicle_type_id = $2
         WHERE d.user_id = ANY($1::int[])`,
        [candidateIds.map(Number), vehicleTypeId]
    );

    const withDistance = await Promise.all(
        rows.map(async (r) => {
            const loc = await valkey.hgetall(`driver:loc:${r.driver_id}`);
            if (!loc || !loc.lat) return null;
            return {
                driverId: r.driver_id,
                ratingAverage: r.rating_average,
                distanceKm: haversineKm(pickupLat, pickupLng, Number(loc.lat), Number(loc.lng))
            };
        })
    );

    return withDistance
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
}

/**
 * Combines ETA proximity, rating, and a fairness term so drivers who've
 * waited longest aren't perpetually skipped for whoever happens to be
 * closest — see ULTIMATE_REFINEMENT_PLAN.md §4.7. idleSeconds defaults to
 * 0 (no data yet); Phase-4-and-beyond would track real idle time per
 * driver to make this term meaningful.
 */
function scoreDriver({ distanceKm, ratingAverage, idleSeconds = 0 }) {
    const etaScore = Math.max(0, 1 - distanceKm / 10); // 10km+ -> 0
    const ratingScore = (ratingAverage ?? 4.0) / 5;
    const fairnessScore = Math.min(1, idleSeconds / 1800);
    return 0.55 * etaScore + 0.25 * ratingScore + 0.2 * fairnessScore;
}

module.exports = { updateDriverLocation, matchPostGIS, matchH3, scoreDriver, haversineKm, H3_RESOLUTION };
