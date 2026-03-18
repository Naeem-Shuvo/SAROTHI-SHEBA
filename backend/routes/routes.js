const express = require('express');
const { loginPage, dashboardPage, dbHealth } = require('../contoller/login');
const {registerPage}=require('../contoller/register');
const router = express.Router();

router.post('/login', loginPage);
router.get('/dashboard', dashboardPage);
router.get('/db-health', dbHealth);
router.post('/register',registerPage)
module.exports = router;