const express = require('express');
const { loginPage, dbHealth, logoutPage } = require('../controller/login');
const { dashboardPage } = require('../controller/dashboard');
const { registerPage, registerAsAdmin, registerAsDriver, adminApproveDriver, registerVehicle, registerAsPassenger } = require('../controller/register');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getPassengerDashboard } = require('../controller/passengerDashboard');
const { getDriverDashboard } = require('../controller/driverDashboard');
const { getAdminDashboard } = require('../controller/adminDashboard');
const { requestRide } = require('../controller/rideRequest');
const { acceptRide } = require('../controller/rideAccept');
const { updateRideStatus } = require('../controller/rideStatus');
const { getAvailableRides } = require('../controller/availableRides');
const { rateRide } = require('../controller/rateRide');
const { getRideHistory } = require('../controller/rideHistory');
const { getAdminUsers, deactivateUser } = require('../controller/adminUsers');
const { getAdminRides } = require('../controller/adminRides');
const { sendMessage, getMessages } = require('../controller/messages');
const { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN, getPaymentStatus, cashPayment } = require('../controller/payment');

const router = express.Router();

// SSLCommerz sends POST callbacks with URL-encoded form data, not JSON
router.use('/payment/success', express.urlencoded({ extended: true }));
router.use('/payment/fail', express.urlencoded({ extended: true }));
router.use('/payment/cancel', express.urlencoded({ extended: true }));
router.use('/payment/ipn', express.urlencoded({ extended: true }));

// dashboard routes for each role
router.get('/dashboard/passenger', authMiddleware, getPassengerDashboard);
router.get('/dashboard/driver', authMiddleware, getDriverDashboard);
router.get('/dashboard/admin', authMiddleware, getAdminDashboard);
router.post('/login', loginPage);
router.post('/logout', authMiddleware, logoutPage);
router.get('/dashboard', authMiddleware, dashboardPage);
router.get('/db-health', dbHealth);

// registration and role assignment routes
router.post('/register', registerPage);
router.post('/register/admin', authMiddleware, registerAsAdmin);
router.post('/register/driver', authMiddleware, registerAsDriver);
router.post('/register/passenger', authMiddleware, registerAsPassenger);
router.post('/driver/vehicle', authMiddleware, registerVehicle);

// admin management routes
router.post('/admin/approve-driver', authMiddleware, adminApproveDriver);
router.post('/admin/reject-driver', authMiddleware, adminRejectDriver);
router.get('/admin/users', authMiddleware, getAdminUsers);
router.delete('/admin/users/:user_id', authMiddleware, deactivateUser);
router.get('/admin/rides', authMiddleware, getAdminRides);

// ride flow routes
router.post('/rides/request', authMiddleware, requestRide);
router.post('/rides/accept', authMiddleware, acceptRide);
router.put('/rides/:ride_id/status', authMiddleware, updateRideStatus);
router.get('/rides/available', authMiddleware, getAvailableRides);
router.post('/rides/:ride_id/rate', authMiddleware, rateRide);
router.get('/rides/history', authMiddleware, getRideHistory);

// in-ride messaging routes
router.post('/rides/:ride_id/messages', authMiddleware, sendMessage);
router.get('/rides/:ride_id/messages', authMiddleware, getMessages);

// payment routes (init requires auth, callbacks are public from SSLCommerz)
router.post('/payment/init/:ride_id', authMiddleware, initPayment);
router.post('/payment/success', paymentSuccess);
router.post('/payment/fail', paymentFail);
router.post('/payment/cancel', paymentCancel);
router.post('/payment/ipn', paymentIPN);
router.get('/payment/status/:ride_id', authMiddleware, getPaymentStatus);
router.put('/payment/cash/:ride_id', authMiddleware, cashPayment);

module.exports = router;