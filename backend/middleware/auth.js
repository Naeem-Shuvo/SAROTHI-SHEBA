const { clerkMiddleware, getAuth } = require('@clerk/express');
const pool = require('../db/pool');

// check clerk config
const isClerkConfigured = () => {
    const key = process.env.CLERK_PUBLISHABLE_KEY;
    return key && !key.includes('REPLACE_ME');
};

// init clerk middleware
let clerkAuth;
if (isClerkConfigured()) {
    clerkAuth = clerkMiddleware();
} else {
    console.warn('Clerk keys not configured, auth disabled');
    clerkAuth = (req, res, next) => next();
}

// auth middleware
async function requireAuth(req, res, next) {
    try {
        if (!isClerkConfigured()) {
            return res.status(503).json({
                error: 'Authentication not configured. Add Clerk keys to .env',
            });
        }

        const auth = getAuth(req);

        if (!auth || !auth.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const clerkUserId = auth.userId;

        // lookup db user
        const result = await pool.query(
            'SELECT user_id FROM Users WHERE clerk_id = $1',
            [clerkUserId]
        );

        if (result.rows.length === 0) {
            // auto-sync fallback
            try {
                const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
                    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
                });
                const clerkUser = await clerkRes.json();

                const name = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || 'Unknown';
                const email = clerkUser.email_addresses?.[0]?.email_address || '';
                const phone = clerkUser.phone_numbers?.[0]?.phone_number || '';

                const insertResult = await pool.query(
                    `INSERT INTO Users (clerk_id, name, email, phone_number, password_hash)
           VALUES ($1, $2, $3, $4, 'clerk_managed')
           ON CONFLICT (clerk_id) DO UPDATE SET name = $2
           RETURNING user_id`,
                    [clerkUserId, name, email, phone || `auto_${Date.now()}`]
                );

                req.userId = insertResult.rows[0].user_id;
                req.clerkUserId = clerkUserId;
                console.log(`Auto-synced user: ${name}`);
                return next();
            } catch (syncErr) {
                console.error('Auto-sync failed:', syncErr.message);
                return res.status(401).json({
                    error: 'User not found and auto-sync failed',
                });
            }
        }

        // attach user info
        req.userId = result.rows[0].user_id;
        req.clerkUserId = clerkUserId;

        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(401).json({ error: 'Authentication failed' });
    }
}

module.exports = { clerkAuth, requireAuth };
