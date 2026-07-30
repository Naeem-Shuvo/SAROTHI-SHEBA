const express = require('express');
const { loginPage, dbHealth, logoutPage } = require('../controller/login');
const { dashboardPage } = require('../controller/dashboard');
const { registerPage, registerAsAdmin, registerAsDriver, adminApproveDriver, adminRejectDriver, registerVehicle, registerAsPassenger } = require('../controller/register');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
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
const { updateLocation } = require('../controller/driverLocation');

const router = express.Router();

// SSLCommerz sends POST callbacks with URL-encoded form data, not JSON
router.use('/payment/success', express.urlencoded({ extended: true }));
router.use('/payment/fail', express.urlencoded({ extended: true }));
router.use('/payment/cancel', express.urlencoded({ extended: true }));
router.use('/payment/ipn', express.urlencoded({ extended: true }));

// Fixes P1-5: role checks are now visible right here, at the route table,
// instead of being one of six differently-worded inline variants buried
// inside each controller. requireRole (backend/middleware/authMiddleware.js)
// is the single place that logic lives now. Existing inline checks are
// left in controllers as redundant defense-in-depth, not removed — see
// authMiddleware.js's comment for why.
//
// Routes where either party can legitimately act (rating, messaging,
// history, status transitions with role-dependent sub-rules) are left
// without a blanket requireRole — that logic is genuinely conditional on
// more than just "what role is this", so it stays inline in the
// controller where the full context is.

// dashboard routes for each role
router.get('/dashboard/passenger', authMiddleware, requireRole('passenger'), getPassengerDashboard);
router.get('/dashboard/driver', authMiddleware, requireRole('driver'), getDriverDashboard);
router.get('/dashboard/admin', authMiddleware, requireRole('admin'), getAdminDashboard);
router.post('/login', loginPage);
router.post('/logout', authMiddleware, logoutPage);
router.get('/dashboard', authMiddleware, dashboardPage);
router.get('/db-health', dbHealth);

// registration and role assignment routes
router.post('/register', registerPage);
router.post('/register/admin', authMiddleware, requireRole('admin'), registerAsAdmin);
router.post('/register/driver', authMiddleware, registerAsDriver);
router.post('/register/passenger', authMiddleware, registerAsPassenger);
router.post('/driver/vehicle', authMiddleware, requireRole('driver'), registerVehicle);

// admin management routes
router.post('/admin/approve-driver', authMiddleware, requireRole('admin'), adminApproveDriver);
router.post('/admin/reject-driver', authMiddleware, requireRole('admin'), adminRejectDriver);
router.get('/admin/users', authMiddleware, requireRole('admin'), getAdminUsers);
router.delete('/admin/users/:user_id', authMiddleware, requireRole('admin'), deactivateUser);
router.get('/admin/rides', authMiddleware, requireRole('admin'), getAdminRides);

// ride flow routes
router.post('/rides/request', authMiddleware, requireRole('passenger'), requestRide);
router.post('/rides/accept', authMiddleware, requireRole('driver'), acceptRide);
router.put('/rides/:ride_id/status', authMiddleware, updateRideStatus);
router.get('/rides/available', authMiddleware, requireRole('driver'), getAvailableRides);
router.post('/rides/:ride_id/rate', authMiddleware, rateRide);
router.get('/rides/history', authMiddleware, getRideHistory);

// geospatial matching (Phase 4)
router.put('/driver/location', authMiddleware, requireRole('driver'), updateLocation);

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
