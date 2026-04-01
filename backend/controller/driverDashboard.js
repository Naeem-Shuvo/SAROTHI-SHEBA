const { query } = require('../../database/db');

const getDriverDashboard = async (req, res) => {
    const userId = req.user.userId;
    try {
        //driver profile(user,driver,vehicle,vehicle type join kore)
        const profile = await query(
            `SELECT u.name, u.email, u.phone_number, 
                    d.license_number, d.rating_average, d.status,
                    v.plate_number, v.model, v.color, vt.type_name
             FROM users u
             JOIN drivers d ON u.user_id = d.user_id
             LEFT JOIN vehicles v ON d.user_id = v.driver_id
             LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.vehicle_type_id
             WHERE u.user_id = $1`,
            [userId]
        );

        //ride history(ride,user join kore)
        const rides = await query(
            `SELECT r.ride_id, r.pickup_address, r.drop_address, r.fare_amount,
                    r.ride_status, r.requested_at, r.distance_km,
                    pu.name AS passenger_name
             FROM rides r
             JOIN users pu ON r.passenger_id = pu.user_id
             WHERE r.driver_id = $1
             ORDER BY r.requested_at DESC`,
            [userId]
        );

        //earnings summary(ride table join kore)
        const earnings = await query(
            `SELECT COUNT(*) AS total_rides,
                    COALESCE(SUM(fare_amount), 0) AS total_earnings
             FROM rides
             WHERE driver_id = $1 AND ride_status = 'completed'`,
            [userId]
        );

        res.status(200).json({
            profile: profile.rows[0] || null,
            rides: rides.rows,
            earnings: earnings.rows[0],
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load driver dashboard' });
    }
};

module.exports = { getDriverDashboard };
