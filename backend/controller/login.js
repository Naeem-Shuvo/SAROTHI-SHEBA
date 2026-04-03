const jwt=require('jsonwebtoken');
//env theke secret key nite import kora
require('dotenv').config();
const { query } = require('../../database/db');
const crypto=require('crypto');
const { blacklistToken } = require('../middleware/tokenBlacklist');

// const requireAdmin = (decoded, minLevel = 1)=>{
//     if(decoded.role!='admin' || !decoded.lvl || decoded.lvl < minLevel){
//         return false;
//     }
//     return true;
// }

// const requireDriver=(decoded)=>{
//     if(decoded.role==='driver'){
//         return true;
//     }
//     return false;
// }

// const requirePassenger=(decoded)=>{
//     if(decoded.role==='passenger'){
//         return true;
//     }
//     return false;
// }

const loginPage = async (req, res) => {
    const { username, password,email,phone_number } = req.body;
    if ((!username && !email && !phone_number) || !password) {
        return res.status(400).json({ message: 'Email or phone_number and password are required' });
    }

    try {
        const userResult = await query(
            'SELECT user_id, name, email, phone_number, password_hash FROM users WHERE username = $1 OR email = $1 OR phone_number = $1 LIMIT 1',
            [username || email || phone_number]
            //LIMIT 1 means it returns only one matched user.
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'this user does not exist' });
        }

        const user = userResult.rows[0];

        const hashedPass=crypto.createHash('sha256').update(password).digest('hex');
        if (user.password_hash !== hashedPass) {
            return res.status(401).json({ message: 'wrong password' });
        }

        let role = 'user';
        let lvl = null;

        const adminResult = await query(
            'SELECT admin_level FROM admins WHERE admin_id=$1 LIMIT 1',
            [user.user_id]
        );

        if (adminResult.rows.length > 0) {
            role = 'admin';
            lvl = adminResult.rows[0].admin_level;
        } else {
            const driverResult = await query(
                'SELECT 1 FROM drivers WHERE user_id=$1 LIMIT 1',
                [user.user_id]
            );

            if (driverResult.rows.length > 0) {
                role = 'driver';
            } else {
                const passengerResult = await query(
                    'SELECT 1 FROM passengers WHERE user_id=$1 LIMIT 1',
                    [user.user_id]
                );

                if (passengerResult.rows.length > 0) {
                    role = 'passenger';
                }
            }
        }

        const tokenPayload = {
            userId: user.user_id,
            username: user.name,
            role
        };

        if (role === 'admin') {
            tokenPayload.lvl = lvl;
        }

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phone_number,
                role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};


const dbHealth = async (req, res) => {
    try {
        const result = await query('SELECT NOW() AS server_time');
        res.status(200).json({ message: 'Database OK', serverTime: result.rows[0].server_time });
    } catch (error) {
        res.status(500).json({ message: 'Database unavailable' });
    }
};

const logoutPage = async (req, res) => {
    try {
        blacklistToken(req.token, req.user && req.user.exp);
        return res.status(200).json({ message: 'Logout successful. Token invalidated.' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { loginPage,dbHealth,logoutPage };