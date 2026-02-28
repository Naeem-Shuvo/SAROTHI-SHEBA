const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { selectRole, getMe } = require('../controllers/userController');

// GET /api/users/me — get current user's profile + role
router.get('/me', requireAuth, getMe);

// POST /api/users/role — select passenger or driver role
router.post('/role', requireAuth, selectRole);

module.exports = router;
