const { query } = require('../../database/db');

const getAvailableRides = async (req, res) => {
    const decoded = req.user;
    //available rides dekhar access shudhu driver er ache
    if (!decoded || decoded.role !== 'driver') {
        return res.status(403).json({ msg: 'Only drivers can view available rides' });
    }

    try {
        //requested status e ja ja ride ache shegulo show korchi
        const result = await query(
            `SELECT r.ride_id, r.pickup_address, r.drop_address, r.requested_at,
                    u.name AS passenger_name, u.phone_number AS passenger_phone,
                    vt.type_name AS vehicle_type
             FROM rides r
             JOIN users u ON r.passenger_id = u.user_id
             JOIN vehicle_types vt ON r.vehicle_type_id = vt.vehicle_type_id
             WHERE r.ride_status = 'requested'
             ORDER BY r.requested_at ASC`
        );

        res.status(200).json({
            rides: result.rows,
        });
    } catch (error) {
        console.error('Error fetching available rides:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { getAvailableRides };
