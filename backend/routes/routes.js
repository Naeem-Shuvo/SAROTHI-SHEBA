const express = require('express');
const { loginPage, dashboardPage, dbHealth, logoutPage } = require('../contoller/login');
const {registerPage, registerAsAdmin,registerAsDriver,adminApproveDriver,registerVehicle,registerAsPassenger}=require('../contoller/register');
const {authMiddleware} =require('../middleware/authMiddleware');
const router = express.Router();

router.post('/login', loginPage);
router.post('/logout', authMiddleware, logoutPage);
router.get('/dashboard', authMiddleware, dashboardPage);
router.get('/db-health', dbHealth);
router.post('/register',registerPage)
router.post('/register/admin', authMiddleware, registerAsAdmin);
router.post('/register/driver',authMiddleware,registerAsDriver);
router.post('/admin/approve-driver',authMiddleware,adminApproveDriver);
router.post('/driver/vehicle',authMiddleware,registerVehicle);
router.post('/register/passenger',authMiddleware,registerAsPassenger);
module.exports = router;