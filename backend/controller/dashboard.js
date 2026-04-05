const { query } = require('../../database/db');
const { requireAdmin, requireDriver, requirePassenger } = require('../middleware/authMiddleware');

const dashboardPage = async (req, res) => {
     const decoded = req.user;

     // admin access

     if (await requireAdmin(decoded, 1)) {
          return res.send('Welcome to the admin dashboard!');
     }
     // driver access 
     else if (await requireDriver(decoded)) {
          return res.send('Welcome to the driver dashboard!');
     }
     // passenger access 
     else if (requirePassenger(decoded)) {
          return res.send('Welcome to the passenger dashboard!');
     }

     return res.status(403).json({ message: 'Access denied: role is not authorized for dashboard' });

}

module.exports = { dashboardPage };
