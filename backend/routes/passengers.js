const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getPassengerDashboard } = require('../controllers/passengerController');

// passenger dashboard
router.get('/dashboard', requireAuth, getPassengerDashboard);

module.exports = router;
