const express = require('express');
const { loginPage, dbHealth, logoutPage } = require('../controller/login');
const { dashboardPage } = require('../controller/dashboard');
const { registerPage, registerAsAdmin, registerAsDriver, adminApproveDriver, registerVehicle, registerAsPassenger } = require('../controller/register');
const { authMiddleware,requireAdmin } = require('../middleware/authMiddleware');
const { getPassengerDashboard } = require('../controller/passengerDashboard');
const { getDriverDashboard } = require('../controller/driverDashboard');
const { getAdminDashboard } = require('../controller/adminDashboard');
const { requestRide } = require('../controller/rideRequest');
const { acceptRide } = require('../controller/rideAccept');
const { updateRideStatus } = require('../controller/rideStatus');
const { getAvailableRides } = require('../controller/availableRides');
const { rateRide } = require('../controller/rateRide');
const { getRideHistory } = require('../controller/rideHistory');


const router = express.Router();

router.get('/dashboard/passenger', authMiddleware, getPassengerDashboard);
router.get('/dashboard/driver', authMiddleware, getDriverDashboard);

//admin kina check kore dashboard dekhabe

router.get('/dashboard/admin', authMiddleware, async (req, res, next) => {
	const isAdmin = await requireAdmin(req.user, 1);
	if (!isAdmin) {
		return res.status(403).json({ message: 'Forbidden: admin access required' });
	}
	next();
}, getAdminDashboard);
router.post('/login', loginPage);
router.post('/logout', authMiddleware, logoutPage);
router.get('/dashboard', authMiddleware, dashboardPage);
router.get('/db-health', dbHealth);
router.post('/register', registerPage)
router.post('/register/admin', authMiddleware, registerAsAdmin);
router.post('/register/driver', authMiddleware, registerAsDriver);
router.post('/admin/approve-driver', authMiddleware, adminApproveDriver);
router.post('/driver/vehicle', authMiddleware, registerVehicle);
router.post('/register/passenger', authMiddleware, registerAsPassenger);
router.post('/rides/request', authMiddleware, requestRide);
router.post('/rides/accept', authMiddleware, acceptRide);
router.put('/rides/:ride_id/status', authMiddleware, updateRideStatus);
router.get('/rides/available', authMiddleware, getAvailableRides);
router.post('/rides/:ride_id/rate', authMiddleware, rateRide);
router.get('/rides/history', authMiddleware, getRideHistory);

module.exports = router;