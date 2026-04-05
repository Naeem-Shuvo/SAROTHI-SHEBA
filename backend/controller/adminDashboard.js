const { query } = require('../../database/db');

//decoder neya lagtese na cz nam dham show kortesi na
//middleware diye auth kortesi,admin holei dhukabe noile noy
const getAdminDashboard = async (req, res) => {
    try {
        //stats
        const stats = await query(
            `SELECT 
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM drivers) AS total_drivers,
                (SELECT COUNT(*) FROM passengers) AS total_passengers,
                (SELECT COUNT(*) FROM rides) AS total_rides,
                (SELECT COALESCE(SUM(fare_amount), 0) FROM rides WHERE ride_status = 'completed') AS total_revenue`
        );

        // driver application(driver application,user join kore)
        const pendingApps = await query(
            `SELECT da.application_id, da.user_id, da.license_number, da.applied_at,
                    u.name, u.email, u.phone_number
             FROM driver_applications da
             JOIN users u ON da.user_id = u.user_id
             WHERE da.status = 'pending'
             ORDER BY da.applied_at DESC`
        );

        res.status(200).json({
            stats: stats.rows[0],
            pendingApplications: pendingApps.rows,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load admin dashboard' });
    }
};

module.exports = { getAdminDashboard };
