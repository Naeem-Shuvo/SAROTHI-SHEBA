const pool = require('../db/pool');

/**
 * GET /api/drivers/dashboard
 * 
 * Returns the driver's stats, vehicle info, and recent rides.
 * Uses JOINs, aggregations, and subqueries (raw SQL showcase).
 */
async function getDriverDashboard(req, res) {
    const userId = req.userId;

    try {
        // 1. Driver profile stats
        const profileResult = await pool.query(
            `SELECT d.user_id, u.name, u.email, u.phone_number,
              d.license_number, d.rating_average, d.status
       FROM Drivers d
       JOIN Users u ON d.user_id = u.user_id
       WHERE d.user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }

        const profile = profileResult.rows[0];

        // 2. Vehicle info
        const vehicleResult = await pool.query(
            `SELECT v.vehicle_id, v.plate_number, v.model, v.color,
              vt.type_name AS vehicle_type
       FROM Vehicles v
       JOIN Vehicle_Types vt ON v.vehicle_type_id = vt.vehicle_type_id
       WHERE v.driver_id = $1`,
            [userId]
        );

        // 3. Ride stats (total rides, earnings)
        const statsResult = await pool.query(
            `SELECT 
         COUNT(*) AS total_rides,
         COUNT(*) FILTER (WHERE ride_status = 'completed') AS completed_rides,
         COALESCE(SUM(fare_amount) FILTER (WHERE ride_status = 'completed'), 0) AS total_earnings
       FROM Rides
       WHERE driver_id = $1`,
            [userId]
        );

        const stats = statsResult.rows[0];

        // 4. Recent rides (last 5) with passenger info
        const recentRidesResult = await pool.query(
            `SELECT r.ride_id, r.pickup_address, r.drop_address,
              r.fare_amount, r.distance_km, r.ride_status,
              r.requested_at, r.drop_time,
              u.name AS passenger_name,
              vt.type_name AS vehicle_type
       FROM Rides r
       JOIN Users u ON r.passenger_id = u.user_id
       LEFT JOIN Vehicle_Types vt ON r.vehicle_type_id = vt.vehicle_type_id
       WHERE r.driver_id = $1
       ORDER BY r.requested_at DESC
       LIMIT 5`,
            [userId]
        );

        res.json({
            profile,
            vehicle: vehicleResult.rows[0] || null,
            stats,
            recent_rides: recentRidesResult.rows,
        });
    } catch (err) {
        console.error('❌ Driver dashboard error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { getDriverDashboard };
