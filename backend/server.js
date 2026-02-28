const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { clerkAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());
app.use(clerkAuth); // Clerk session parsing (does NOT block — just adds auth state)

// --------------- Routes ---------------

// Public routes
const healthRoutes = require('./routes/health');
const webhookRoutes = require('./routes/webhooks');
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected routes (auth enforced inside each route via requireAuth)
const userRoutes = require('./routes/users');
const passengerRoutes = require('./routes/passengers');
const driverRoutes = require('./routes/drivers');
app.use('/api/users', userRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/drivers', driverRoutes);

// --------------- Start Server ---------------
app.listen(PORT, () => {
    console.log(`🚀 SAROTHI-SHEBA server running on http://localhost:${PORT}`);
});
