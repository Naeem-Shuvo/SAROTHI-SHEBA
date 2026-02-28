const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDriverDashboard } = require('../controllers/driverController');

// GET /api/drivers/dashboard — driver stats + vehicle + recent rides
router.get('/dashboard', requireAuth, getDriverDashboard);

module.exports = router;
