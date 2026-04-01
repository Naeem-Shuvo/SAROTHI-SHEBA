const jwt = require('jsonwebtoken');
//env theke secret key nite import kora
require('dotenv').config();
const { query } = require('../../database/db');
const crypto = require('crypto');

const registerPage = async (req, res) => {
    const { username, email, phone_number, password } = req.body;
    if (!username || !email || !phone_number || !password) {
        return res.status(400).json({ msg: 'All fields are required' });
    }
    try {
        const queryResult = await query(
            'SELECT * FROM users WHERE email=$1 OR phone_number=$2',
            [email, phone_number]
        )
        if (queryResult.rows.length > 0) {
            return res.status(400).json({ msg: 'User already exists with this email or phone number' });
        }

        const hashedPass = crypto.createHash('sha256').update(password).digest('hex');
        const insertResult = await query(
            'INSERT INTO users (name,email,phone_number,password_hash) VALUES ($1,$2,$3,$4) RETURNING user_id, name',
            //returns rows = [{ user_id: 123 }]
            //{} er moddhe rows, and joto rows sob array akare pass kore
            [username, email, phone_number, hashedPass]
        )
        //ibject
        const userInfo = { user_id: insertResult.rows[0].user_id, name: insertResult.rows[0].name };
        const token = jwt.sign(
            { userId: userInfo.user_id, username: userInfo.name }, //passing object to jwt.sign
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        )
        res.status(201).json({
            msg: 'User registered successfully',
            token,
            user: userInfo
        })
    } catch (error) {
        console.error('Error occurred while registering user:', error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }

}

const registerAsAdmin = async (req, res) => {
    const decoded = req.user;
    if (!decoded) {
        return res.status(401).json({ msg: 'Unauthorized: invalid or missing user context' });
    }

    const userId = decoded.userId;
    const userName = decoded.username;
    const { admin_secret } = req.body;

    if (!admin_secret) {
        return res.status(400).json({ msg: 'admin_secret is required' });
    }

    let lvl;
    if (admin_secret === process.env.ADMIN_LEVEL1) {
        lvl = 1;
    } else if (admin_secret === process.env.ADMIN_LEVEL2) {
        lvl = 2;
    } else {
        return res.status(403).json({ msg: 'Invalid admin secret' });
    }
    await query(
        'INSERT INTO Admins (admin_id, admin_level) VALUES ($1, $2) ON CONFLICT (admin_id) DO UPDATE SET admin_level = EXCLUDED.admin_level',
        // /If a row with the same admin_id already exists (conflict on primary key/unique key), do not fail.
        [userId, lvl]
    );

    // Issue a fresh token that carries admin claims.   
    const newToken = jwt.sign({ userId, username: userName, lvl, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({
        msg: 'User promoted to admin successfully',
        token: newToken,
        user: { userId, username: userName, adminLevel: lvl }
    });

}

const registerAsDriver = async (req, res) => {
    const decoded = req.user;
    if (!decoded) {
        return res.status(401).json({ msg: 'Unauthorized: invalid or missing user context from regDriver' });
    }
    const userId = decoded.userId;
    const { license_number } = req.body;
    if (!license_number) {
        return res.status(400).json({ msg: 'license_number is required to register as driver' });
    }
    await query(
        'INSERT INTO driver_applications (user_id, license_number) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [userId, license_number]
    );
    return res.status(200).json({
        msg: 'Driver application submitted successfully',
    });


}



const adminApproveDriver = async (req, res) => {
    const adminDecoded = req.user;
    if (!adminDecoded || adminDecoded.role !== 'admin') {
        return res.status(401).json({ msg: 'Unauthorized: only admins can approve driver applications' });
    }
    const { user_id } = req.body;
    const resultPending = await query(
        'select * from driver_applications where user_id=$1 and status=$2',
        [user_id, 'pending']
    )
    if (resultPending.rows.length === 0) {
        return res.status(404).json({ msg: 'No pending driver application found for this user_id' });
    }
    const license = resultPending.rows[0].license_number;
    //const plateNumber=resultPending.rows[0].plate_number;
    //**ekhane ektu kaj korbi frontend theke admin allow korle then db in hbe */

    await query(
        'insert into Drivers (user_id, license_number, rating_average, status) values ($1, $2, 0, $3) on conflict (user_id) do nothing',
        [user_id, license, 'active']
    )

    await query(
        'update driver_applications set status=$1 where user_id=$2',
        ['approved', user_id]
    );

    return res.status(200).json({
        msg: 'Your vehicle and registration approved, now exit and login',
        user: { userId: user_id, status: 'active' }
    });

}

const registerVehicle = async (req, res) => {
    const driverDecoded = req.user;
    if (!driverDecoded || driverDecoded.role !== 'driver') {
        return res.status(401).json({ msg: 'Unauthorized: only drivers can register vehicles' });
    }
    const userId = driverDecoded.userId;
    const { type_name, plate_number, model, color } = req.body;
    if (!type_name || !plate_number || !model || !color) {
        return res.status(400).json({ msg: 'All vehicle details are required' });
    }
    const vehicleTypeResult = await query(
        'select * from Vehicle_Types where type_name=$1',
        [type_name]//case sensitive, so frontend e type_name er value thik dite hobe, like 'Car', 'Bike', 'Auto'
    )
    if (vehicleTypeResult.rows.length === 0) {
        return res.status(400).json({ msg: 'Invalid vehicle type' });
    }
    const typeId = vehicleTypeResult.rows[0].vehicle_type_id;
    await query(
        'insert into Vehicles (driver_id, vehicle_type_id, plate_number, model, color) values ($1, $2, $3, $4, $5)',
        [userId, typeId, plate_number, model, color]
    )
    return res.status(200).json({ msg: 'Vehicle registered successfully' });
}

const registerAsPassenger = async (req, res) => {
    const decoded = req.user;
    if (!decoded) {
        return res.status(401).json({ msg: 'Unauthorized: invalid or missing user context from regPassenger' });
    }
    const userId = decoded.userId;

    //check whether pre exist
    const dummy = await query(
        'SELECT * FROM Passengers WHERE user_id=$1',
        [userId]
    )
    if (dummy.rows.length > 0) {
        return res.status(400).json({ msg: 'User is already registered as passenger' });
    }
    await query(
        'insert into Passengers (user_id,rating_average,total_distance) values ($1, 0, 0) on conflict (user_id) do nothing',
        [userId]
    )
    const newToken = jwt.sign({ userId, username: decoded.username, role: 'passenger' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({
        msg: 'User registered as passenger successfully',
        token: newToken,
        user: { userId, username: decoded.username, role: 'passenger' }
    })
}
module.exports = { registerPage, registerAsAdmin, registerAsDriver, adminApproveDriver, registerVehicle, registerAsPassenger };
//object akare export korle require o object akare kora lagbe