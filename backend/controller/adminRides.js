const { query } = require('../../database/db');

// get all rides with passenger/driver names and filters
const getAdminRides = async (req, res) => {
    const decoded = req.user;

    // only admins can access this endpoint
    if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized: admin only' });
    }

    // optional query string filter like ?status=completed or ?status=ongoing
    const { status } = req.query;

    try {
        let sqlQuery = `
            SELECT r.ride_id, r.pickup_address, r.drop_address, 
                   r.ride_status, r.distance_km, r.fare_amount, 
                   r.requested_at, r.drop_time,
                   up.name AS passenger_name, up.email AS passenger_email,
                   ud.name AS driver_name, ud.email AS driver_email,
                   vt.type_name AS vehicle_type
            FROM rides r
            JOIN users up ON r.passenger_id = up.user_id
            LEFT JOIN users ud ON r.driver_id = ud.user_id
            JOIN vehicle_types vt ON r.vehicle_type_id = vt.vehicle_type_id
        `;
        const params = [];

        // if a status filter is provided, add a WHERE clause
        if (status) {
            sqlQuery += ' WHERE r.ride_status = $1';
            params.push(status);
        }

        // order by most recent first
        sqlQuery += ' ORDER BY r.requested_at DESC LIMIT 100';

        const result = await query(sqlQuery, params);

        res.status(200).json({ rides: result.rows });
    } catch (error) {
        console.error('Error fetching admin rides:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { getAdminRides };
