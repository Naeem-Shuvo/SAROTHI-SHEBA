const { clerkMiddleware, getAuth } = require('@clerk/express');
const pool = require('../db/pool');

/**
 * Clerk Auth Middleware
 * 
 * 1. clerkAuth: Parses the Clerk session JWT (non-blocking, adds auth state).
 *    - Skipped if Clerk keys are not configured yet (development mode).
 * 2. requireAuth: Enforces authentication on protected routes.
 *    - Verifies a valid Clerk session exists.
 *    - Looks up DB user_id from clerk_id.
 *    - Attaches req.userId and req.clerkUserId for downstream use.
 */

// Check if Clerk is properly configured
const isClerkConfigured = () => {
    const key = process.env.CLERK_PUBLISHABLE_KEY;
    return key && !key.includes('REPLACE_ME');
};

// Initialize Clerk middleware only if keys are configured
let clerkAuth;
if (isClerkConfigured()) {
    clerkAuth = clerkMiddleware();
} else {
    console.warn('⚠️  Clerk keys not configured — auth middleware disabled. Add your keys to .env');
    clerkAuth = (req, res, next) => next(); // pass-through
}

async function requireAuth(req, res, next) {
    try {
        // If Clerk is not configured, block protected routes
        if (!isClerkConfigured()) {
            return res.status(503).json({
                error: 'Authentication not configured. Add Clerk keys to .env',
            });
        }

        // getAuth extracts the auth state set by clerkMiddleware
        const auth = getAuth(req);

        if (!auth || !auth.userId) {
            return res.status(401).json({ error: 'Unauthorized — no valid session' });
        }

        const clerkUserId = auth.userId;

        // Look up the DB user_id from clerk_id
        const result = await pool.query(
            'SELECT user_id FROM Users WHERE clerk_id = $1',
            [clerkUserId]
        );

        if (result.rows.length === 0) {
            // Auto-sync fallback: create user from Clerk session data
            // This handles the case where the webhook didn't fire (e.g. ngrok not running)
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
                console.log(`✅ Auto-synced user: ${name} (webhook fallback)`);
                return next();
            } catch (syncErr) {
                console.error('❌ Auto-sync failed:', syncErr.message);
                return res.status(401).json({
                    error: 'User not found and auto-sync failed. Check Clerk keys.',
                });
            }
        }

        // Attach to request for downstream use
        req.userId = result.rows[0].user_id;
        req.clerkUserId = clerkUserId;

        next();
    } catch (err) {
        console.error('❌ Auth middleware error:', err.message);
        res.status(401).json({ error: 'Authentication failed' });
    }
}

module.exports = { clerkAuth, requireAuth };
