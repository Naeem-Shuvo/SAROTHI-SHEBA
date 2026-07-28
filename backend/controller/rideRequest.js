const { query, withTransaction } = require('../../database/db');
const { dispatchRide } = require('../dispatch');
const logger = require('../logger');

const requestRide = async (req, res) => {
    const decoded = req.user;
    // only passengers can request rides
    if (!decoded || decoded.role !== 'passenger') {
        return res.status(403).json({ msg: 'Only passengers can request rides' });
    }

    // extract all location fields from the request body
    const { pickup_address, drop_address, vehicle_type_id, pickup_lat, pickup_lng, drop_lat, drop_lng } = req.body;

    // validate that all required fields are present
    if (!pickup_address || !drop_address || !vehicle_type_id) {
        return res.status(400).json({ msg: 'pickup_address, drop_address, and vehicle_type_id are required' });
    }

    // validate that lat/lng coordinates are provided (DB columns are NOT NULL)
    if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng) {
        return res.status(400).json({ msg: 'pickup and drop coordinates (lat/lng) are required' });
    }

    try {
        // friendly pre-check for a nice error message — correctness does
        // NOT depend on this; rides_one_active_per_passenger (a partial
        // unique index, migration 20260728130002) is what actually
        // prevents the race, at the database, unconditionally. See
        // ULTIMATE_REFINEMENT_PLAN.md §4.4.
        const activeRide = await query(
            `SELECT ride_id FROM rides
             WHERE passenger_id = $1 AND ride_status IN ('requested', 'accepted', 'ongoing')`,
            [decoded.userId]
        );
        if (activeRide.rows.length > 0) {
            return res.status(409).json({ msg: 'You already have an active ride' });
        }

        // validate that the vehicle type exists in the database
        const vtResult = await query(
            'SELECT vehicle_type_id FROM vehicle_types WHERE vehicle_type_id = $1',
            [vehicle_type_id]
        );
        if (vtResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid vehicle type' });
        }

        let ride;
        try {
            ride = await withTransaction(async (client) => {
                const result = await client.query(
                    `INSERT INTO rides (passenger_id, vehicle_type_id, pickup_address, drop_address,
                                        pickup_latitude, pickup_longitude, drop_latitude, drop_longitude, ride_status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'requested')
                     RETURNING ride_id, passenger_id, vehicle_type_id, pickup_address, drop_address,
                               pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
                               ride_status, requested_at`,
                    [decoded.userId, vehicle_type_id, pickup_address, drop_address,
                     pickup_lat, pickup_lng, drop_lat, drop_lng]
                );
                return result.rows[0];
            }, { actorId: decoded.userId });
        } catch (error) {
            if (error.code === '23505') {
                // Lost the race the pre-check above couldn't fully close —
                // the database caught what the app-level check missed.
                return res.status(409).json({ msg: 'You already have an active ride' });
            }
            throw error;
        }

        // Phase 4: replaces the old global.io.emit('new_ride_request') —
        // a broadcast to literally every connected socket, matching
        // section §1.6's core finding that this app had no matching
        // engine at all. Runs AFTER the ride's own transaction commits
        // (dispatch does its own matching queries + a separate
        // withTransaction for the offer) — a best-effort follow-up, not
        // part of the ride's atomicity. If dispatch finds no candidate
        // right now, the ride stays 'requested' and the sweeper
        // (dispatch.js) or a manual pull via GET /rides/available can
        // still surface it later.
        dispatchRide(
            ride.ride_id,
            Number(ride.pickup_latitude),
            Number(ride.pickup_longitude),
            ride.vehicle_type_id
        ).catch((err) => logger.error({ err, rideId: ride.ride_id }, 'Dispatch failed after ride creation'));

        res.status(201).json({
            msg: 'Ride requested successfully',
            ride,
        });
    } catch (error) {
        console.error('Error requesting ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { requestRide };
