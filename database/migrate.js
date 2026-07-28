#!/usr/bin/env node
// Thin wrapper around the node-pg-migrate CLI. PG_HOST/PG_PORT/PG_USER/
// PG_PASSWORD/PG_DATABASE in backend/.env are the single source of truth
// for DB connection info (same values database/db.js's pool uses) — this
// script builds a DATABASE_URL from them rather than maintaining a second,
// separately-configured copy that could silently drift out of sync.
//
// Usage (from repo root):
//   npm run migrate:up
//   npm run migrate:down
//   node database/migrate.js create some-migration-name

const path = require('path');
const { spawnSync } = require('child_process');
const config = require('../backend/config'); // validates the whole env, fails fast if broken

const databaseUrl =
    `postgres://${encodeURIComponent(config.PG_USER)}:${encodeURIComponent(config.PG_PASSWORD)}` +
    `@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DATABASE}`;

const migrationsDir = path.join(__dirname, 'migrations');
const args = process.argv.slice(2);

// Invoke node-pg-migrate's own entry script directly with `node`, rather
// than shelling out through `npx`. On Windows, npx resolves to npx.cmd,
// and spawning .cmd files without `shell: true` is unreliable — it can
// fail silently. Running `node <script>.js` directly sidesteps the shell
// entirely and works identically on every platform.
const migrateBin = require.resolve('node-pg-migrate/bin/node-pg-migrate');

const result = spawnSync(
    process.execPath, // the currently-running node binary
    [migrateBin, ...args, '--migrations-dir', migrationsDir],
    {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl }
    }
);

process.exit(result.status ?? 1);
