const { query } = require('../../database/db');
const { verifyPassword, hashPassword } = require('../password');
const { signToken } = require('../jwt');
const { revokeToken } = require('../tokenRevocation');

const loginPage = async (req, res) => {
    const { username, password, email, phone_number } = req.body;
    if ((!username && !email && !phone_number) || !password) {
        return res.status(400).json({ message: 'Email or phone_number and password are required' });
    }

    try {
        //logic allows a user to log in creatively using either their username, email address, or phone number.
        // is_active check added in Phase 2 (P1-12): a deactivated account
        // must not be able to log in — see adminUsers.js's deactivateUser,
        // which now soft-deletes via this flag instead of hard-deleting
        // role rows.
        const userResult = await query(
            'SELECT user_id, name, email, phone_number, password_hash FROM users WHERE (name = $1 OR email = $1 OR phone_number = $1) AND is_active = TRUE LIMIT 1',
            [username || email || phone_number]
            //LIMIT 1 means it returns only one matched user.
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'this user does not exist' });
        }

        const user = userResult.rows[0];

        // Fixes P1-1 (unsalted SHA-256 -> Argon2id). needsRehash is true
        // exactly when this user still has a legacy hash and just proved
        // they know the plaintext — the only safe moment to upgrade it,
        // with no forced reset and no user-visible disruption.
        const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'wrong password' });
        }
        if (needsRehash) {
            const newHash = await hashPassword(password);
            await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, user.user_id]);
        }

        let role = 'user';
        let lvl = null;

        const adminResult = await query(
            'SELECT admin_level FROM admins WHERE admin_id=$1 LIMIT 1',
            [user.user_id]
        );

        if (adminResult.rows.length > 0) {
            role = 'admin';
            lvl = adminResult.rows[0].admin_level;
        } else {
            const driverResult = await query(
                'SELECT 1 FROM drivers WHERE user_id=$1 LIMIT 1',
                [user.user_id]
            );

            if (driverResult.rows.length > 0) {
                role = 'driver';
            } else {
                const passengerResult = await query(
                    'SELECT 1 FROM passengers WHERE user_id=$1 LIMIT 1',
                    [user.user_id]
                );

                if (passengerResult.rows.length > 0) {
                    role = 'passenger';
                }
            }
        }

        const tokenPayload = {
            userId: user.user_id,
            name: user.name,
            role
        };

        if (role === 'admin') {
            tokenPayload.lvl = lvl;
        }

        const token = signToken(tokenPayload, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token,
            //token and json duitai pathano redundanct but convenient for frontend,token diye auth korbe, json diye user info show korbe
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phone_number,
                role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//eta kisu na :)
const dbHealth = async (req, res) => {
    try {
        const result = await query('SELECT NOW() AS server_time');
        res.status(200).json({ message: 'Database OK', serverTime: result.rows[0].server_time });
    } catch (error) {
        res.status(500).json({ message: 'Database unavailable' });
    }
};

const logoutPage = async (req, res) => {
    try {
        // Fixes P1-14: revocation now lives in Valkey (shared, durable),
        // not an in-process Map that forgets everything on restart and is
        // invisible to any other running process. Keyed by jti, not the
        // full token string.
        await revokeToken(req.user && req.user.jti, req.user && req.user.exp);
        return res.status(200).json({ message: 'Logout successful. Token invalidated.' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { loginPage, dbHealth, logoutPage };
