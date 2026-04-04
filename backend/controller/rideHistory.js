const { query } = require('../../database/db');

const getRideHistory = async (req, res) => {
    const decoded = req.user;

    try {
        let sqlQuery = '';
        let params = [decoded.userId];

        if (decoded.role === 'driver') {
            // driver sees their rides with passenger name and payment status
            sqlQuery = `
                SELECT r.ride_id, r.pickup_address, r.drop_address, r.ride_status, 
                       r.distance_km, r.fare_amount, r.drop_time, r.requested_at,
                       u.name AS passenger_name, 
                       vt.type_name AS vehicle_type,
                       p.payment_status
                FROM rides r
                JOIN users u ON r.passenger_id = u.user_id
                JOIN vehicle_types vt ON r.vehicle_type_id = vt.vehicle_type_id
                LEFT JOIN payments p ON r.ride_id = p.ride_id
                WHERE r.driver_id = $1
                ORDER BY r.ride_id DESC
            `;
        } else if (decoded.role === 'passenger') {
            // passenger sees their rides with driver name and payment status
            sqlQuery = `
                SELECT r.ride_id, r.pickup_address, r.drop_address, r.ride_status, 
                       r.distance_km, r.fare_amount, r.drop_time, r.requested_at,
                       u.name AS driver_name, 
                       vt.type_name AS vehicle_type,
                       p.payment_status
                FROM rides r
                LEFT JOIN users u ON r.driver_id = u.user_id
                JOIN vehicle_types vt ON r.vehicle_type_id = vt.vehicle_type_id
                LEFT JOIN payments p ON r.ride_id = p.ride_id
                WHERE r.passenger_id = $1
                ORDER BY r.ride_id DESC
            `;
        } else if (decoded.role === 'admin') {
            // admin sees all rides with both names
            sqlQuery = `
                SELECT r.ride_id, r.pickup_address, r.drop_address, r.ride_status, 
                       r.distance_km, r.fare_amount, r.drop_time, r.requested_at,
                       up.name AS passenger_name, ud.name AS driver_name,
                       p.payment_status
                FROM rides r
                JOIN users up ON r.passenger_id = up.user_id
                LEFT JOIN users ud ON r.driver_id = ud.user_id
                LEFT JOIN payments p ON r.ride_id = p.ride_id
                ORDER BY r.ride_id DESC
                LIMIT 50
            `;
            params = [];
        }

        const result = await query(sqlQuery, params);

        res.status(200).json({
            history: result.rows
        });

    } catch (error) {
        console.error('Error fetching ride history:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { getRideHistory };
