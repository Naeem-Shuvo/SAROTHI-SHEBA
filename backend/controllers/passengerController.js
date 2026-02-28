const pool = require('../db/pool');

/**
 * GET /api/passengers/dashboard
 * 
 * Returns the passenger's stats and recent rides.
 * Uses JOINs and aggregate functions (raw SQL showcase).
 */
async function getPassengerDashboard(req, res) {
    const userId = req.userId;

    try {
        // 1. Passenger profile stats
        const profileResult = await pool.query(
            `SELECT p.user_id, u.name, u.email, u.phone_number,
              p.rating_average, p.total_distance
       FROM Passengers p
       JOIN Users u ON p.user_id = u.user_id
       WHERE p.user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Passenger profile not found' });
        }

        const profile = profileResult.rows[0];

        // 2. Ride stats (total rides, completed rides)
        const statsResult = await pool.query(
            `SELECT 
         COUNT(*) AS total_rides,
         COUNT(*) FILTER (WHERE ride_status = 'completed') AS completed_rides,
         COALESCE(SUM(fare_amount) FILTER (WHERE ride_status = 'completed'), 0) AS total_spent
       FROM Rides
       WHERE passenger_id = $1`,
            [userId]
        );

        const stats = statsResult.rows[0];

        // 3. Recent rides (last 5) with driver info
        const recentRidesResult = await pool.query(
            `SELECT r.ride_id, r.pickup_address, r.drop_address,
              r.fare_amount, r.distance_km, r.ride_status,
              r.requested_at, r.drop_time,
              u.name AS driver_name,
              vt.type_name AS vehicle_type
       FROM Rides r
       LEFT JOIN Users u ON r.driver_id = u.user_id
       LEFT JOIN Vehicle_Types vt ON r.vehicle_type_id = vt.vehicle_type_id
       WHERE r.passenger_id = $1
       ORDER BY r.requested_at DESC
       LIMIT 5`,
            [userId]
        );

        res.json({
            profile,
            stats,
            recent_rides: recentRidesResult.rows,
        });
    } catch (err) {
        console.error('❌ Passenger dashboard error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { getPassengerDashboard };
