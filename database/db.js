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

function query(text, params) {
    return pool.query(text, params);
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