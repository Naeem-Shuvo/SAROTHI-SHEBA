const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { clerkAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(clerkAuth);

// public routes
const healthRoutes = require('./routes/health');
const webhookRoutes = require('./routes/webhooks');
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);

// protected routes
const userRoutes = require('./routes/users');
const passengerRoutes = require('./routes/passengers');
const driverRoutes = require('./routes/drivers');
app.use('/api/users', userRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/drivers', driverRoutes);

// start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
