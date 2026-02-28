const pool = require('../db/pool');

/**
 * POST /api/users/role
 * 
 * Body: { "role": "passenger" | "driver", "license_number"?: "..." }
 * 
 * Inserts the authenticated user into the Passengers or Drivers table.
 */
async function selectRole(req, res) {
    const userId = req.userId; // set by auth middleware
    const { role, license_number } = req.body;

    if (!role || !['passenger', 'driver'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "passenger" or "driver"' });
    }

    try {
        if (role === 'passenger') {
            // Check if already a passenger
            const existing = await pool.query(
                'SELECT user_id FROM Passengers WHERE user_id = $1', [userId]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'You are already registered as a passenger' });
            }

            await pool.query(
                'INSERT INTO Passengers (user_id, rating_average, total_distance) VALUES ($1, 0, 0)',
                [userId]
            );
        }

        if (role === 'driver') {
            if (!license_number) {
                return res.status(400).json({ error: 'Drivers must provide a license_number' });
            }

            // Check if already a driver
            const existing = await pool.query(
                'SELECT user_id FROM Drivers WHERE user_id = $1', [userId]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'You are already registered as a driver' });
            }

            await pool.query(
                `INSERT INTO Drivers (user_id, license_number, rating_average, status)
         VALUES ($1, $2, 0, 'available')`,
                [userId, license_number]
            );
        }

        console.log(`✅ User ${userId} registered as ${role}`);
        res.json({ success: true, role });
    } catch (err) {
        console.error('❌ Role selection error:', err.message);

        if (err.code === '23505') { // unique violation
            return res.status(409).json({ error: 'Duplicate entry — role already assigned or license already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/users/me
 * 
 * Returns the authenticated user's profile and role.
 */
async function getMe(req, res) {
    const userId = req.userId;

    try {
        // Get base user info
        const userResult = await pool.query(
            'SELECT user_id, name, email, phone_number, created_at FROM Users WHERE user_id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Determine role by checking each role table
        let role = null;

        const passengerCheck = await pool.query(
            'SELECT user_id FROM Passengers WHERE user_id = $1', [userId]
        );
        if (passengerCheck.rows.length > 0) role = 'passenger';

        const driverCheck = await pool.query(
            'SELECT user_id FROM Drivers WHERE user_id = $1', [userId]
        );
        if (driverCheck.rows.length > 0) role = 'driver';

        const adminCheck = await pool.query(
            'SELECT admin_id FROM Admins WHERE admin_id = $1', [userId]
        );
        if (adminCheck.rows.length > 0) role = 'admin';

        res.json({
            ...user,
            role,
        });
    } catch (err) {
        console.error('❌ Get user error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { selectRole, getMe };
