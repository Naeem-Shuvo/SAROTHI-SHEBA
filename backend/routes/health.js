const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/health
// Returns server status + DB connectivity check
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS server_time');
        res.json({
            status: 'ok',
            server_time: result.rows[0].server_time,
            database: 'connected',
        });
    } catch (err) {
        console.error('Health check failed:', err.message);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: err.message,
        });
    }
});

module.exports = router;
