require('dotenv').config();
const cors = require('cors');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const router = require('./routes/routes');
const { testConnection, closePool } = require('../database/db');

const app = express();

app.use(express.static('../public'));
app.use(express.json()); //need to be placed before the router
app.use(cors());
app.use(router);

const port = process.env.PORT || 3000;

// create an HTTP server and attach Socket.io to it
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// make io accessible globally so controllers can emit events
global.io = io;

// handle new socket connections
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // users join a personal room using their user_id for targeted messages
    socket.on('join_room', (roomId) => {
        socket.join(`user_${roomId}`);
        console.log(`Socket ${socket.id} joined room: user_${roomId}`);
    });

    // drivers join a shared 'drivers' room to receive ride requests
    socket.on('join_drivers', () => {
        socket.join('drivers');
        console.log(`Socket ${socket.id} joined drivers room`);
    });

    // drivers send their GPS location, which is forwarded to the passenger's room
    socket.on('driver_location_update', (data) => {
        // data should contain { passenger_id, lat, lng }
        if (data && data.passenger_id) {
            socket.to(`user_${data.passenger_id}`).emit('driver_location_update', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

async function startServer() {
    try {
        await testConnection();

        // use server.listen instead of app.listen so socket.io works
        server.listen(port, () => {
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