const pool = require('../db/pool');

// select role
async function selectRole(req, res) {
    const userId = req.userId;
    const { role, license_number } = req.body;

    if (!role || !['passenger', 'driver'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "passenger" or "driver"' });
    }

    try {
        if (role === 'passenger') {
            const existing = await pool.query(
                'SELECT user_id FROM Passengers WHERE user_id = $1', [userId]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Already registered as passenger' });
            }

            await pool.query(
                'INSERT INTO Passengers (user_id, rating_average, total_distance) VALUES ($1, 0, 0)',
                [userId]
            );
        }

        if (role === 'driver') {
            if (!license_number) {
                return res.status(400).json({ error: 'License number required' });
            }

            const existing = await pool.query(
                'SELECT user_id FROM Drivers WHERE user_id = $1', [userId]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Already registered as driver' });
            }

            await pool.query(
                `INSERT INTO Drivers (user_id, license_number, rating_average, status)
         VALUES ($1, $2, 0, 'available')`,
                [userId, license_number]
            );
        }

        console.log(`User ${userId} registered as ${role}`);
        res.json({ success: true, role });
    } catch (err) {
        console.error('Role selection error:', err.message);

        if (err.code === '23505') {
            return res.status(409).json({ error: 'Duplicate entry' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

// get current user
async function getMe(req, res) {
    const userId = req.userId;

    try {
        const userResult = await pool.query(
            'SELECT user_id, name, email, phone_number, created_at FROM Users WHERE user_id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // determine role
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

        res.json({ ...user, role });
    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { selectRole, getMe };
