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
            `SELECT u.user_id, u.name, u.email, u.phone_number, u.created_at, u.is_active,
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

// Deactivate a user by their ID.
//
// Fixed in Phase 2 (P1-12): this used to hard-DELETE the user's role rows
// across three tables, non-atomically. Every historical ride still
// references passengers(user_id)/drivers(user_id) by foreign key, so
// that either orphaned the join (silently breaking ride history) or
// failed outright with a FK violation the moment the user had any rides.
// It was also completely irreversible and unaudited — no way to tell
// "deactivated" apart from "never existed".
//
// Real fix: flip users.is_active to FALSE (added in migration
// 20260728130007). login.js already checks this flag, so a deactivated
// account can no longer authenticate. Nothing is deleted — every FK
// stays intact, ride history stays joinable, and reactivation is just
// flipping the flag back.
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
        const result = await query(
            `UPDATE users SET is_active = FALSE, updated_at = now()
             WHERE user_id = $1 AND is_active = TRUE
             RETURNING user_id`,
            [user_id]
        );

        if (result.rows.length === 0) {
            // Either the user doesn't exist, or was already deactivated —
            // distinguish the two for a clearer response.
            const exists = await query('SELECT 1 FROM users WHERE user_id = $1', [user_id]);
            if (exists.rows.length === 0) {
                return res.status(404).json({ msg: 'User not found' });
            }
            return res.status(400).json({ msg: 'User is already deactivated' });
        }

        res.status(200).json({ msg: 'User deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating user:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { getAdminUsers, deactivateUser };
