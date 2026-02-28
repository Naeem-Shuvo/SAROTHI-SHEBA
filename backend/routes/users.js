const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { selectRole, getMe } = require('../controllers/userController');

// user routes
router.get('/me', requireAuth, getMe);
router.post('/role', requireAuth, selectRole);

module.exports = router;
