require('dotenv').config();
const cors = require('cors');
const express = require('express');
const router = require('./routes/routes');
const { testConnection, closePool } = require('../database/db');
const app = express();

app.use(express.static('../public'));
app.use(express.json()); //need to be placed before the router
app.use(cors());
app.use(router);


const port = process.env.PORT || 3000;

async function startServer() {
    try {
        await testConnection();

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

async function shutdown() {
    try {
        await closePool();
        process.exit(0);
    } catch (error) {
        console.error('Error while closing database pool:', error.message);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();