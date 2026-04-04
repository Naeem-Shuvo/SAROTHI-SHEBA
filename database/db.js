const { Pool } = require('pg');

const pool = new Pool({
    database: process.env.PG_DATABASE || 'postgres',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'NewPassword123',
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(text, params);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
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