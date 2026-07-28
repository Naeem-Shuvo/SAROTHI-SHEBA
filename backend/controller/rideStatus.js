const { query, withTransaction } = require('../../database/db');
const { enqueueEvent } = require('../../database/outbox');

const updateRideStatus = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;
    const { status, distance_km } = req.body;

    //status pass kora lagbe
    if (!status) {
        return res.status(400).json({ msg: 'status is required' });
    }

    try {
        //ride ta valid kina check korchi
        const rideResult = await query('SELECT * FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        //shudhumatro driver e ongoing ba completed e change korte parbe status
        if ((status === 'ongoing' || status === 'completed') && decoded.userId !== ride.driver_id) {
            return res.status(403).json({ msg: 'Only the assigned driver can update this ride' });
        }

        //completed hole distance_km pass kora lagbe
        if (status === 'completed') {
            if (!distance_km || distance_km <= 0) {
                return res.status(400).json({ msg: 'distance_km is required to complete a ride' });
            }
        }

        try {
            await withTransaction(async (client) => {
                if (status === 'completed') {
                    // The stored procedure is idempotent and state-guarded
                    // as of migration 20260728130008 (P1-9) — a duplicate
                    // call is a safe no-op, not a double-counted distance.
                    // check_ride_status_transition_trigger (migration
                    // 20260728130001) validates the transition itself;
                    // an illegal jump raises here and rolls the whole
                    // transaction back, so no partial state or stray
                    // outbox event can ever result from a rejected one.
                    await client.query('CALL complete_ride($1, $2)', [ride_id, distance_km]);
                } else {
                    await client.query(
                        'UPDATE rides SET ride_status = $1, version = version + 1 WHERE ride_id = $2',
                        [status, ride_id]
                    );
                }

                // Fixes P1-8. Also fixes a real, previously-undetected bug:
                // SocketContext.jsx's "please pay the driver" toast checks
                // `data.ride_status === 'completed'`, but this used to emit
                // only `status` — a key mismatch that silently made that
                // toast permanently dead code. Both keys are included now.
                const rooms = [`user_${ride.passenger_id}`];
                if (ride.driver_id) rooms.push(`user_${ride.driver_id}`);

                await enqueueEvent(client, {
                    aggregateType: 'ride',
                    aggregateId: String(ride_id),
                    eventType: 'ride_status_update',
                    rooms,
                    data: { ride_id: Number(ride_id), status, ride_status: status }
                });
            }, { actorId: decoded.userId });
        } catch (error) {
            if (error.message && error.message.startsWith('Illegal ride_status transition')) {
                return res.status(409).json({ msg: `Cannot change status from '${ride.ride_status}' to '${status}'` });
            }
            throw error;
        }

        res.status(200).json({ msg: `Ride status updated to '${status}'` });

    } catch (error) {
        console.error('Error updating ride status:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { updateRideStatus };
