const { query, withTransaction } = require('../../database/db');
const { enqueueEvent } = require('../../database/outbox');

const acceptRide = async (req, res) => {

    //user ta driver kina check korchi
    const decoded = req.user;
    if (!decoded || decoded.role !== 'driver') {
        return res.status(403).json({ msg: 'Only drivers can accept rides' });
    }

    //ride ta valid kina check korchi
    const { ride_id } = req.body;
    if (!ride_id) {
        return res.status(400).json({ msg: 'ride_id is required' });
    }

    try {
        // driver er already active ride ase kina check korchi
        const activeRide = await query(
            `SELECT ride_id FROM rides
             WHERE driver_id = $1 AND ride_status IN ('accepted', 'ongoing')`,
            [decoded.userId]
        );
        if (activeRide.rows.length > 0) {
            return res.status(409).json({ msg: 'You already have an active ride' });
        }

        let ride;
        try {
            ride = await withTransaction(async (client) => {
                // This WHERE guard IS optimistic concurrency control —
                // genuinely correct already (see
                // ULTIMATE_REFINEMENT_PLAN.md §4.2). Two drivers racing to
                // accept: whichever UPDATE commits first wins; the second
                // re-evaluates the WHERE clause against the now-changed
                // row, matches nothing, returns 0 rows. version is bumped
                // alongside for the general case (Phase 4's dispatch
                // offers need to detect ANY concurrent change, not just a
                // status change).
                const result = await client.query(
                    `UPDATE rides SET driver_id = $1, ride_status = 'accepted', version = version + 1
                     WHERE ride_id = $2 AND ride_status = 'requested'
                     RETURNING ride_id, passenger_id, driver_id, pickup_address, drop_address, ride_status, version`,
                    [decoded.userId, ride_id]
                );

                if (result.rows.length === 0) {
                    // Not a database error — a race genuinely lost. No
                    // exception thrown; the caller checks for this below.
                    return null;
                }

                const acceptedRide = result.rows[0];

                // Fixes P1-8: this used to fire via global.io.emit
                // immediately after query() returned, outside any
                // transaction the caller controlled. Now it can only be
                // seen after this COMMIT.
                await enqueueEvent(client, {
                    aggregateType: 'ride',
                    aggregateId: String(acceptedRide.ride_id),
                    eventType: 'ride_accepted',
                    rooms: [`user_${acceptedRide.passenger_id}`],
                    data: acceptedRide
                });

                return acceptedRide;
            }, { actorId: decoded.userId });
        } catch (error) {
            if (error.code === '23505') {
                // rides_one_active_per_driver — the database catching a
                // race the pre-check above (necessarily, being a separate
                // statement) can't fully close on its own.
                return res.status(409).json({ msg: 'You already have an active ride' });
            }
            throw error;
        }

        if (ride === null) {
            return res.status(404).json({ msg: 'Ride not found or already accepted' });
        }

        res.status(200).json({
            msg: 'Ride accepted',
            ride,
        });
    } catch (error) {
        console.error('Error accepting ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { acceptRide };
