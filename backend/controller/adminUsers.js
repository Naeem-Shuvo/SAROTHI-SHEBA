const { query } = require('../../database/db');

// get all users with their role information
const getAdminUsers = async (req, res) => {
    const decoded = req.user;

    // only admins can access this endpoint
    if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized: admin only' });
    }

    try {
        // fetch all users and left join on every role table to determine their role
        const result = await query(
            `SELECT u.user_id, u.name, u.email, u.phone_number, u.created_at,
                    CASE 
                        WHEN a.admin_id IS NOT NULL THEN 'admin'
                        WHEN d.user_id IS NOT NULL THEN 'driver'
                        WHEN p.user_id IS NOT NULL THEN 'passenger'
                        ELSE 'unassigned'
                    END AS role,
                    d.status AS driver_status,
                    d.rating_average AS driver_rating
             FROM users u
             LEFT JOIN admins a ON u.user_id = a.admin_id
             LEFT JOIN drivers d ON u.user_id = d.user_id
             LEFT JOIN passengers p ON u.user_id = p.user_id
             ORDER BY u.created_at DESC`
        );

        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

// deactivate a user by their ID (soft delete: remove from role tables)
const deactivateUser = async (req, res) => {
    const decoded = req.user;

    // only admins can deactivate users
    if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized: admin only' });
    }

    const { user_id } = req.params;

    // prevent admin from deactivating themselves
    if (parseInt(user_id) === decoded.userId) {
        return res.status(400).json({ msg: 'You cannot deactivate yourself' });
    }

    try {
        // check if the user exists before trying to deactivate
        const userCheck = await query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // remove the user from all role tables (soft delete approach)
        await query('DELETE FROM drivers WHERE user_id = $1', [user_id]);
        await query('DELETE FROM passengers WHERE user_id = $1', [user_id]);
        await query('DELETE FROM admins WHERE admin_id = $1', [user_id]);

        res.status(200).json({ msg: 'User deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating user:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { getAdminUsers, deactivateUser };
