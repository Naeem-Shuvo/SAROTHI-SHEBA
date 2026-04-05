const { query } = require('../../database/db');

const getPassengerDashboard = async (req, res) => {
    const userId = req.user.userId;
    try {
        //passenger profile(user ar passenger join kore)
        const profile = await query(
            `SELECT u.name, u.email, u.phone_number, p.rating_average, p.total_distance
             FROM users u
             JOIN passengers p ON u.user_id = p.user_id
             WHERE u.user_id = $1`,
            [userId]
        );

        //ride history(ride,vehicle type,driver ar user join kore)
        const rides = await query(
            `SELECT r.ride_id, r.pickup_address, r.drop_address, r.fare_amount, 
                    r.ride_status, r.requested_at, r.distance_km,
                    r.driver_id,
                    r.pickup_latitude AS pickup_lat, r.pickup_longitude AS pickup_lng,
                    r.drop_latitude AS drop_lat, r.drop_longitude AS drop_lng,
                    vt.type_name AS vehicle_type,
                    du.name AS driver_name,
                    p.payment_status,
                    (my_rating.rating_id IS NOT NULL) AS rated_by_me
             FROM rides r
             JOIN vehicle_types vt ON r.vehicle_type_id = vt.vehicle_type_id
             LEFT JOIN users du ON r.driver_id = du.user_id
             LEFT JOIN payments p ON p.ride_id = r.ride_id
             LEFT JOIN ratings my_rating ON my_rating.ride_id = r.ride_id AND my_rating.rater_id = $1
             WHERE r.passenger_id = $1
             ORDER BY r.requested_at DESC`,
            [userId]
        );

        res.status(200).json({
            profile: profile.rows[0] || null,
            rides: rides.rows,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load dashboard' });
    }
};

module.exports = { getPassengerDashboard };
