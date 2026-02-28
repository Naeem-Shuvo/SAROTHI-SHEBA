const express = require('express');
const router = express.Router();
const { handleClerkWebhook } = require('../controllers/webhookController');

// POST /api/webhooks/clerk
// This route is PUBLIC — no auth middleware.
// Clerk sends webhook events here when users are created/updated/deleted.
router.post('/clerk', handleClerkWebhook);

module.exports = router;
