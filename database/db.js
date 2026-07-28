const { Pool } = require('pg');

// Fail fast and loudly on missing config. A silent fallback (the old
// `|| 'NewPassword123'`) turns a typo'd env var into a confusing connection
// error 20 minutes later instead of a clear message right now.
// Phase 1 replaces this with full Zod validation of the whole environment.
function required(name) {
    const value = process.env[name];
    if (value === undefined || value === '') {
        throw new Error(
            `Missing required environment variable: ${name}\n` +
            `  Copy backend/.env.example to backend/.env and fill it in.`
        );
    }
    return value;
}

const pool = new Pool({
    database: process.env.PG_DATABASE || 'postgres',
    user: process.env.PG_USER || 'postgres',
    password: required('PG_PASSWORD'),
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});

async function testConnection() {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
        console.log('Database connected successfully');
    } finally {
        client.release();
    }
}

async function query(text, params) {
    const sql = (text || '').trim().toUpperCase();
    const isDml = /^(INSERT|UPDATE|DELETE|CALL)\b/.test(sql);

    // Keep reads fast, but make every DML explicit with BEGIN/COMMIT/ROLLBACK.
    if (!isDml) {
        return pool.query(text, params);
    }
    //dedicated arekta connection nicche jaate conflict na hoy
    const client = await pool.connect();
    try {
        //ekhane conflicting write ops chalachhe
        await client.query('BEGIN');
        const result = await client.query(text, params);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            //transaction e failure e rollback
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError.message);
        }
        throw error;
    } finally {
        client.release();
    }
}

function closePool() {
    return pool.end();
}

module.exports = {
    pool,
    testConnection,
    query,
    closePool
};