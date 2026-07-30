const { verifyToken } = require('../jwt');
const { isTokenRevoked } = require('../tokenRevocation');
const { query } = require('../../database/db');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    //authoriazation format: Bearer <token>
    //every HTTP request has a headers section.sob header e auth thake na
    //Protected routes usually send it, commonly as: Bearer <jwt_token>
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 401 Unauthorized: client did not provide valid authentication
        //  credentials (missing token, bad token, expired token).
        return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    }
    const token = authHeader.split(' ')[1]; //Bearer <token> theke token ta alada kora
    try {
        const decoded = verifyToken(token);

        // Fixes P1-14: revocation now checked against Valkey (shared,
        // durable, keyed by jti) rather than an in-process Map that a
        // restart or a second Node process could never see.
        if (await isTokenRevoked(decoded.jti)) {
            return res.status(401).json({ msg: 'Unauthorized: token has been logged out' });
        }
        req.user = decoded; //decoded object with userId, username, role, lvl
        req.token = token;
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Unauthorized: token expired from authMiddleware' });
        }
        return res.status(401).json({ msg: 'error caused on Authmidware decoding token' });
    }
}

// Fixes P1-5: 16 controllers used to each hand-roll their own
// `if (decoded.role !== 'x') return res.status(...)` — six different
// variants, with different status codes (401 vs 403) for the same
// logical condition. This makes the check declarative and visible
// directly at the route table (backend/routes/routes.js), the same way
// the plan calls for: `router.post('/x', authMiddleware,
// requireRole('driver'), controllerFn)`. Existing inline checks are left
// in controllers as redundant defense-in-depth rather than stripped out
// — deleting them is pure cleanup with real edit-volume risk across 16
// files for no functional gain over having both.
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ msg: `Access denied: requires role ${allowedRoles.join(' or ')}` });
        }
        next();
    };
}

const requireAdmin = async (decoded, minLevel = 1) => {
    if (!decoded || decoded.role !== 'admin' || !decoded.lvl || decoded.lvl < minLevel) {
        return false;
    }
    const { userId, lvl } = decoded;
    // Bug fix: this queried `WHERE user_id=$1`, but admins' primary key
    // column is admin_id — the query would throw "column does not
    // exist" the moment this function was actually called for a real
    // admin. Only ever invoked from the vestigial dashboard.js, so it
    // went unnoticed until this phase's review.
    const result = await query(
        'select * from admins where admin_id=$1 and admin_level=$2',
        [userId, lvl]
    );
    return result.rows.length > 0;
}

const requireDriver = async (decoded) => {
    if (!decoded) {
        return false;
    }
    if (decoded.role === 'driver') {
        return true;
    }
    const { userId } = decoded;
    // Check if the user has a driver record in the database
    const result = await query(
        'SELECT * FROM drivers WHERE user_id = $1',
        [userId]
    );
    return result.rows.length > 0;
}

const requirePassenger = (decoded) => {
    if (decoded.role === 'passenger') {
        return true;
    }
    return false;
}
module.exports = { authMiddleware, requireRole, requireAdmin, requireDriver, requirePassenger };
