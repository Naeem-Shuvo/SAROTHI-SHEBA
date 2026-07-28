const cors = require('cors');
const express = require('express');
const http = require('http');
const pinoHttp = require('pino-http');
const { Server } = require('socket.io');
const config = require('./config'); // validates the whole env; loads dotenv itself
const logger = require('./logger');
const router = require('./routes/routes');
const { testConnection, closePool } = require('../database/db');

const app = express();

// cors before the body parser and the router, so preflight OPTIONS requests
// are answered before anything tries to read a body that isn't there.
app.use(cors());
app.use(express.json());
// pino-http generates a per-request id (req.id) and logs method/path/status/
// duration automatically. Every log line a request touches can now be
// grepped out of a busy log by that one id.
app.use(pinoHttp({ logger }));
// No express.static here: this backend is a pure JSON API. The React client is
// served by Vite. The old `express.static('../public')` pointed at a dead legacy
// login prototype AND resolved against the process cwd rather than __dirname,
// so it silently broke depending on where you launched from.
app.use(router);

// create an HTTP server and attach Socket.io to it
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// make io accessible globally so controllers can emit events
// ⚠️ Global mutable state, untestable/unmockable (P2-18) — Phase 3 replaces
// this with the outbox pattern; controllers stop touching io directly.
global.io = io;

// handle new socket connections
// ⚠️ No authentication on any of this yet — see ULTIMATE_REFINEMENT_PLAN.md
// §1.4 P1-2. Any client can join any room by guessing a user_id. Left
// exactly as-is; Phase 5 is where this gets fixed, not Phase 1.
io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    // users join a personal room using their user_id for targeted messages
    socket.on('join_room', (roomId) => {
        socket.join(`user_${roomId}`);
        logger.info({ socketId: socket.id, roomId }, 'Socket joined room');
    });

    // drivers join a shared 'drivers' room to receive ride requests
    socket.on('join_drivers', () => {
        socket.join('drivers');
        logger.info({ socketId: socket.id }, 'Socket joined drivers room');
    });

    // drivers send their GPS location, which is forwarded to the passenger's room
    socket.on('driver_location_update', (data) => {
        // data should contain { passenger_id, lat, lng }
        if (data && data.passenger_id) {
            socket.to(`user_${data.passenger_id}`).emit('driver_location_update', data);
        }
    });

    socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
});

async function startServer() {
    try {
        await testConnection();

        // use server.listen instead of app.listen so socket.io works
        server.listen(config.PORT, () => {
            logger.info({ port: config.PORT }, 'Server is running');
        });
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
