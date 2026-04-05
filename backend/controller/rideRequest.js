const { query } = require('../../database/db');

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
        // check if the passenger already has an active ride
        const activeRide = await query(
            `SELECT ride_id FROM rides 
             WHERE passenger_id = $1 AND ride_status IN ('requested', 'accepted', 'ongoing')`,
            [decoded.userId]
        );
        if (activeRide.rows.length > 0) {
            return res.status(400).json({ msg: 'You already have an active ride' });
        }

        // validate that the vehicle type exists in the database
        const vtResult = await query(
            'SELECT vehicle_type_id FROM vehicle_types WHERE vehicle_type_id = $1',
            [vehicle_type_id]
        );
        if (vtResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid vehicle type' });
        }

        // insert the ride with both coordinates and text addresses
        const result = await query(
            `INSERT INTO rides (passenger_id, vehicle_type_id, pickup_address, drop_address, 
                                pickup_latitude, pickup_longitude, drop_latitude, drop_longitude, ride_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'requested')
             RETURNING ride_id, passenger_id, vehicle_type_id, pickup_address, drop_address, 
                       pickup_latitude, pickup_longitude, drop_latitude, drop_longitude, 
                       ride_status, requested_at`,
            [decoded.userId, vehicle_type_id, pickup_address, drop_address, 
             pickup_lat, pickup_lng, drop_lat, drop_lng]
        );

        // broadcast the new ride to all connected drivers via socket
        if (global.io) {
            global.io.emit('new_ride_request', result.rows[0]);
        }

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
