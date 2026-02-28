const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getPassengerDashboard } = require('../controllers/passengerController');

// GET /api/passengers/dashboard — passenger stats + recent rides
router.get('/dashboard', requireAuth, getPassengerDashboard);

module.exports = router;
