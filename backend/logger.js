// One pino instance, shared by everything in the app. pino-http (wired
// into startPoint.js) generates a per-request correlation id and attaches
// a child logger carrying it — so every log line from a single request
// can be grepped out of a busy log by that id, which console.log scattered
// across 16 controllers could never give you.
//
// Only startPoint.js's own bootstrap/shutdown/socket events use this
// directly in Phase 1. Migrating each controller's console.error calls
// over is mechanical and deferred to Phase 9's logging pass — it doesn't
// gate anything in Phase 1's exit criteria.

const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport:
        process.env.NODE_ENV === 'production'
            ? undefined // production: raw JSON, one line per event, made for log aggregators
            : {
                  target: 'pino-pretty',
                  options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
              }
});

module.exports = logger;
