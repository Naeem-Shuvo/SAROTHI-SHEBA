const jwt=require('jsonwebtoken');
//env theke secret key nite import kora
require('dotenv').config();
const { query } = require('../../database/db');

const loginPage = async (req, res) => {
    const { username, password,email,phone_number } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const userResult = await query(
            'SELECT user_id, name, email, phone_number, password_hash FROM users WHERE email = $1 OR phone_number = $1 LIMIT 1',
            [email || phone_number]
            //LIMIT 1 means it returns only one matched user.
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        if (user.password_hash !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.user_id, username: user.name },
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
                phoneNumber: user.phone_number
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const dashboardPage=(req,res)=>{
    //res.send('Dashboard Page');
    const authHeader=req.headers.authorization;

    //authoriazation format: Bearer <token>
    //every HTTP request has a headers section.sob header e auth thake na
    //Protected routes usually send it, commonly as: Bearer <jwt_token>
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        // 401 Unauthorized: client did not provide valid authentication
        //  credentials (missing token, bad token, expired token).
        return res.status(401).json({message:'Unauthorized: Invalid or missing token'});
    }
    const token=authHeader.split(' ')[1]; //Bearer <token> theke token ta alada kora
    
    //need to verify je valid token kina
    try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
//Decodes payload
//If valid, returns the payload data (like username, userId, role).
    const {username}=decoded; //payload return
    res.status(200).json({message:`Welcome to the dashboard, ${username}!`});
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({message:'Unauthorized: token expired'});
        }
        return res.status(401).json({message:'Unauthorized: invalid token'});
    }
}

const dbHealth = async (req, res) => {
    try {
        const result = await query('SELECT NOW() AS server_time');
        res.status(200).json({ message: 'Database OK', serverTime: result.rows[0].server_time });
    } catch (error) {
        res.status(500).json({ message: 'Database unavailable' });
    }
};

module.exports = { loginPage, dashboardPage, dbHealth };