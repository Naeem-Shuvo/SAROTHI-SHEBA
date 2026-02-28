const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDriverDashboard } = require('../controllers/driverController');

// driver dashboard
router.get('/dashboard', requireAuth, getDriverDashboard);

module.exports = router;
