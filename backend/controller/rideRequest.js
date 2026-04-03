const { query } = require('../../database/db');

const requestRide = async (req, res) => {
    const decoded = req.user;
    if (!decoded || decoded.role !== 'passenger') {
        return res.status(403).json({ msg: 'Only passengers can request rides' });
    }

    const { pickup_address, drop_address, vehicle_type_id } = req.body;
    if (!pickup_address || !drop_address || !vehicle_type_id) {
        return res.status(400).json({ msg: 'pickup_address, drop_address, and vehicle_type_id are required' });
    }

    try {
        // passenger er already active ride ase kina check korchi
        const activeRide = await query(
            `SELECT ride_id FROM rides 
             WHERE passenger_id = $1 AND ride_status IN ('requested', 'accepted', 'ongoing')`,
            [decoded.userId]
        );
        if (activeRide.rows.length > 0) {
            return res.status(400).json({ msg: 'You already have an active ride' });
        }

        // vehicle type ta valid kina check korchi
        const vtResult = await query(
            'SELECT vehicle_type_id FROM vehicle_types WHERE vehicle_type_id = $1',
            [vehicle_type_id]
        );
        if (vtResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid vehicle type' });
        }

        // ride create korchi
        const result = await query(
            `INSERT INTO rides (passenger_id, vehicle_type_id, pickup_address, drop_address, ride_status)
             VALUES ($1, $2, $3, $4, 'requested')
             RETURNING ride_id, passenger_id, vehicle_type_id, pickup_address, drop_address, ride_status, requested_at`,
            [decoded.userId, vehicle_type_id, pickup_address, drop_address]
        );

        res.status(201).json({
            msg: 'Ride requested successfully',
            ride: result.rows[0],
        });
    } catch (error) {
        console.error('Error requesting ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { requestRide };
