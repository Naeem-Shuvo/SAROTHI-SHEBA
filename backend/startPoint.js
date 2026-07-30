const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { Server } = require('socket.io');
const config = require('./config'); // validates the whole env; loads dotenv itself
const logger = require('./logger');
const router = require('./routes/routes');
const { testConnection, closePool, query } = require('../database/db');
const { startOutboxRelay, stopOutboxRelay } = require('./outboxRelay');
const { startDispatchSweeper, stopDispatchSweeper } = require('./dispatch');
const { verifyToken } = require('./jwt');
const { isTokenRevoked } = require('./tokenRevocation');

const app = express();

// Fixes part of P1-4. helmet sets a standard set of defensive HTTP
// headers (X-Content-Type-Options, X-Frame-Options, etc) that had no
// coverage at all before. CORS narrowed from `origin: '*'` (any site on
// the internet could call this API from a browser) to exactly the one
// known frontend origin — this doesn't affect SSLCommerz's webhook
// callbacks, which are server-to-server POSTs, not browser requests, so
// CORS policy never applies to them regardless.
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
// pino-http generates a per-request id (req.id) and logs method/path/status/
// duration automatically. Every log line a request touches can now be
// grepped out of a busy log by that one id.
app.use(pinoHttp({ logger }));

// /login had no rate limiting at all — a free brute-force oracle against
// a database of (formerly SHA-256, now Argon2id) password hashes.
// slowDown adds latency progressively before the hard cap kicks in, which
// degrades a scripted attacker's throughput even before they hit the
// rejection threshold. In-memory store — fine for this single-process
// deployment; a Valkey-backed store is a drop-in upgrade whenever this
// runs as more than one process (not the case yet).
const loginSlowDown = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 5,
    delayMs: (hits) => hits * 250
});
const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Try again later.' }
});
app.use('/login', loginSlowDown, loginRateLimit);

// No express.static here: this backend is a pure JSON API. The React client is
// served by Vite. The old `express.static('../public')` pointed at a dead legacy
// login prototype AND resolved against the process cwd rather than __dirname,
// so it silently broke depending on where you launched from.
app.use(router);

// create an HTTP server and attach Socket.io to it
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: config.FRONTEND_URL, methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Phase 3: controllers no longer touch io directly (P2-18's global
// mutable state, untestable/unmockable). They enqueue an outbox event
// inside their withTransaction call instead (database/outbox.js); only
// outboxRelay.js — started below — holds a reference to io and turns
// committed outbox rows into real emits. global.io is kept only for the
// driver_location_update handler just below, which is a live, ephemeral
// stream with no state to persist — there is nothing to make transactional
// about a GPS ping that's obsolete the instant a newer one arrives.
global.io = io;

// Fixes P1-2 — the most serious single finding in the original audit.
// Before this: `join_room` took a client-supplied roomId with NO
// verification at all, so `socket.emit('join_room', <anyone's id>)`
// silently subscribed you to a stranger's private events — their
// driver's live GPS as it happened, their pickup/drop addresses, their
// ride-accepted notification. `join_drivers` was the same: any
// unauthenticated script could sit in that room and watch every ride
// request in the city. And `driver_location_update` trusted a
// client-supplied `passenger_id`, so anyone could inject fake GPS into a
// stranger's map.
//
// The fix has three parts, all required together — dropping any one
// reopens the hole:
//   1. A handshake auth middleware verifies a real JWT before the
//      'connection' event ever fires. No token, no connection.
//   2. Rooms are joined automatically from the VERIFIED token's claims —
//      there is no join_room/join_drivers handler left AT ALL. A socket
//      cannot be asked to join an arbitrary room; it simply always ends
//      up in the ones its own identity entitles it to.
//   3. driver_location_update no longer trusts the payload's
//      passenger_id — it looks up the driver's OWN active ride
//      server-side and forwards to whichever passenger that ride
//      actually belongs to.
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('UNAUTHENTICATED'));

        const decoded = verifyToken(token);
        if (await isTokenRevoked(decoded.jti)) return next(new Error('REVOKED'));

        socket.data.user = decoded;
        next();
    } catch (error) {
        next(new Error('UNAUTHENTICATED'));
    }
});

io.on('connection', (socket) => {
    const { userId, role } = socket.data.user;
    logger.info({ socketId: socket.id, userId, role }, 'Socket connected (authenticated)');

    // Rooms derived from the verified token — never from anything the
    // client sends. This one change is what closes the IDOR: there is no
    // code path left where a socket can end up in a room it doesn't own.
    socket.join(`user_${userId}`);
    if (role === 'driver') {
        socket.join('drivers');
    }

    // Rate-limited to roughly one update per second per socket — a
    // driver's GPS ping cadence, not an attacker's flood vector.
    let lastLocationUpdate = 0;
    socket.on('driver_location_update', async (data) => {
        if (role !== 'driver') return;
        const now = Date.now();
        if (now - lastLocationUpdate < 900) return;
        lastLocationUpdate = now;

        if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;

        try {
            // The passenger_id is looked up from the driver's OWN active
            // ride — never accepted from the client payload, which is
            // exactly what let anyone forge a position for any ride
            // before this fix.
            const { rows } = await query(
                `SELECT passenger_id, ride_id FROM rides
                 WHERE driver_id = $1 AND ride_status IN ('accepted', 'ongoing')
                 LIMIT 1`,
                [userId]
            );
            if (rows.length === 0) return;

            socket.to(`user_${rows[0].passenger_id}`).emit('driver_location_update', {
                ride_id: rows[0].ride_id,
                lat: data.lat,
                lng: data.lng,
                heading: data.heading
            });
        } catch (error) {
            logger.error({ err: error, userId }, 'driver_location_update forwarding failed');
        }
    });

    socket.on('disconnect', () => {
        logger.info({ socketId: socket.id, userId }, 'Socket disconnected');
    });
});

async function startServer() {
    try {
        await testConnection();

        // use server.listen instead of app.listen so socket.io works
        server.listen(config.PORT, () => {
            logger.info({ port: config.PORT }, 'Server is running');
        });

        startOutboxRelay(io);
        startDispatchSweeper();
    } catch (error) {
        logger.error({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}

// Fixes P2-17: the old shutdown() closed the DB pool and exited immediately,
// with no regard for requests still in flight — a deploy or a Ctrl+C could
// cut a client off mid-response. This drains properly:
//   1. Stop accepting new connections; let in-flight ones finish.
//   2. Close all socket.io connections.
//   3. Only THEN close the DB pool.
//   4. Exit.
// A force-exit timeout guards against a client holding an idle keep-alive
// connection open forever, which would otherwise hang server.close()'s
// callback indefinitely — a well-known Node footgun.
async function shutdown(signal) {
    logger.info({ signal }, 'Shutdown signal received, draining connections');

    const forceExitTimer = setTimeout(() => {
        logger.warn('Graceful shutdown timed out after 10s, forcing exit');
        process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    stopOutboxRelay();
    stopDispatchSweeper();

    try {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
            io.close();
        });

        await closePool();
        clearTimeout(forceExitTimer);
        logger.info('Shutdown complete');
        process.exit(0);
    } catch (error) {
        clearTimeout(forceExitTimer);
        logger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
