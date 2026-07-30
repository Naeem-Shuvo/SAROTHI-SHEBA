const { query, withTransaction } = require('../../database/db');
const { hashPassword } = require('../password');
const { signToken } = require('../jwt');

const registerPage=async (req,res)=>{
    const {username,email,phone_number,password}=req.body;
    if(!username || !email || !phone_number || !password){
        return res.status(400).json({msg:'All fields are required'});
    }


    const validateInputs = (email, phone, name) => {
        const emailPattern = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;
        const phonePattern = /^(\+88)?01[3-9][0-9]{8}$/;
        // Letters and spaces only — no digits. Tightened to match
        // precheck_info_trigger (database/migrations/20260728120003),
        // a DB-level backstop that predates this refinement and was only
        // actually applied for the first time in Phase 1. It was
        // stricter than this check, which used to allow digits in a
        // name — the mismatch meant a name like "Test 2" passed this
        // check but was then rejected by the trigger, surfacing as a
        // confusing 500 instead of a clean 400. Now consistent: same
        // rule enforced at both layers, app-level for a clean error
        // message, DB-level as the real backstop regardless of what the
        // app does.
        const namePattern = /^[A-Za-z ]+$/;

        if (!emailPattern.test(email)) return "Invalid email format. Only @gmail.com is allowed.";
        if (!namePattern.test(name)) return "Invalid username. Only letters and spaces are allowed.";
        if (!phonePattern.test(phone)) return "Invalid phone number format. Must start with 01 or +8801.";
        return null;
    }

    const validationError = validateInputs(email, phone_number, username);
    if (validationError) {
        return res.status(400).json({ msg: validationError });
    }


    try{
        const queryResult=await query(
            'SELECT * FROM users WHERE email=$1 OR phone_number=$2',
            [email,phone_number]
        )
        if(queryResult.rows.length>0){
            return res.status(400).json({msg:'User already exists with this email or phone number'});
        }

        // Fixes P1-1: Argon2id (memory-hard KDF, per-hash random salt)
        // instead of unsalted single-round SHA-256.
        const hashedPass = await hashPassword(password);
        const insertResult=await query(
            'INSERT INTO users (name,email,phone_number,password_hash) VALUES ($1,$2,$3,$4) RETURNING user_id, name',
            //returns rows = [{ user_id: 123 }]
            //{} er moddhe rows, and joto rows sob array akare pass kore
            [username,email,phone_number,hashedPass]
        )
        //object
        const userInfo={user_id: insertResult.rows[0].user_id, name: insertResult.rows[0].name};
        const token = signToken(
            {userId: userInfo.user_id, username: userInfo.name},
            {expiresIn: '1h'}
        )
        res.status(201).json({
            msg:'User registered successfully',
            token,
            user:userInfo
        })
    } catch (error) {
        //db r trigger er error handle korar jonno
        //email format check tao okhane hobe
        console.error('Error occurred while registering user:', error.message);
        return res.status(500).json({msg:'Internal server error'});
    }
}

// Fixes P0-3 / the ADMIN_LEVEL* shared-secret privilege escalation: any
// user who knew (or leaked, or read from git history — see
// ULTIMATE_REFINEMENT_PLAN.md §1.3) the ADMIN_LEVEL1/ADMIN_LEVEL2 string
// could self-promote to admin. There is no secret left to leak — this
// now requires an EXISTING admin's own authenticated session, the same
// admin-promotes-user pattern adminApproveDriver already uses. The very
// first admin is created by database/seed.js at bootstrap time (a direct
// DB insert, not through this endpoint) — real systems solve the
// bootstrap problem the same way: a seed/migration-time action, not a
// runtime shared secret.
const registerAsAdmin = async (req, res) => {
    const adminDecoded = req.user;
    if (!adminDecoded || adminDecoded.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized: only an existing admin can promote a user to admin' });
    }

    const { user_id, admin_level } = req.body;
    if (!user_id || !admin_level || ![1, 2].includes(Number(admin_level))) {
        return res.status(400).json({ msg: 'user_id and admin_level (1 or 2) are required' });
    }

    // An admin can only grant a level up to their own — a level-1 admin
    // can't mint a level-2 admin above themselves.
    if (!adminDecoded.lvl || adminDecoded.lvl < Number(admin_level)) {
        return res.status(403).json({ msg: 'Cannot grant an admin level higher than your own' });
    }

    await query(
        'INSERT INTO Admins (admin_id, admin_level) VALUES ($1, $2) ON CONFLICT (admin_id) DO UPDATE SET admin_level = EXCLUDED.admin_level',
        [user_id, admin_level]
    );

    return res.status(200).json({
        msg: 'User promoted to admin successfully',
        user: { userId: user_id, adminLevel: Number(admin_level) }
    });
}

    const registerAsDriver=async(req,res)=>{
        const decoded=req.user;
        if(!decoded){
            return res.status(401).json({msg:'Unauthorized: invalid or missing user context from regDriver'});
        }
        const userId=decoded.userId;
        const {license_number}=req.body;
        if(!license_number){
            return res.status(400).json({msg:'license_number is required to register as driver'});
        }
        await query(
   'INSERT INTO driver_applications (user_id, license_number) VALUES ($1,$2) ON CONFLICT DO NOTHING',
   [userId, license_number]
);
        // send success response so frontend doesn't hang
        return res.status(200).json({
            msg: 'Driver application submitted successfully. Waiting for admin approval.',
        });
    }



    const adminApproveDriver=async(req,res)=>{
        const adminDecoded=req.user;
        if(!adminDecoded || adminDecoded.role!=='admin'){
            return res.status(401).json({msg:'Unauthorized: only admins can approve driver applications'});
        }
        const {user_id}=req.body;
        const resultPending=await query(
            'select * from driver_applications where user_id=$1 and status=$2',
            [user_id, 'pending']
        )
        if(resultPending.rows.length===0){
            return res.status(404).json({msg: 'No pending driver application found for this user_id'});
        }
        const license=resultPending.rows[0].license_number;

        // Two dependent writes (insert driver, mark application approved)
        // now share one transaction — previously two separate query()
        // calls, each committing independently, so a crash between them
        // could leave a driver row inserted but the application still
        // 'pending' forever, or vice versa (P1-6's shape).
        //
        // rating_average is a GENERATED column since the Phase 2 ratings
        // rebuild (migration 20260728130006) — it can no longer be
        // inserted into directly; it starts at NULL via
        // rating_count/rating_sum defaulting to 0.
        await withTransaction(async (client) => {
            await client.query(
                'insert into Drivers (user_id, license_number, status) values ($1, $2, $3) on conflict (user_id) do nothing',
                [user_id, license, 'active']
            );
            await client.query(
                'update driver_applications set status=$1 where user_id=$2',
                ['approved', user_id]
            );
        }, { actorId: adminDecoded.userId });

        return res.status(200).json({
            msg:'Your vehicle and registration approved, now exit and login',
            user:{userId: user_id, status: 'active'}
        });

    }

   const registerVehicle=async(req,res)=>{
    const driverDecoded=req.user;
    if(!driverDecoded || driverDecoded.role!=='driver'){
        return res.status(401).json({msg:'Unauthorized: only drivers can register vehicles'});
    }
    const userId=driverDecoded.userId;
    const {type_name, plate_number, model, color}=req.body;
    if(!type_name || !plate_number || !model || !color){
        return res.status(400).json({msg:'All vehicle details are required'});
    }
    const vehicleTypeResult=await query(
        'select * from Vehicle_Types where type_name=$1',
        [type_name]//case sensitive, so frontend e type_name er value thik dite hobe, like 'Car', 'Bike', 'Auto'
    )
    if(vehicleTypeResult.rows.length===0){
        return res.status(400).json({msg:'Invalid vehicle type'});
    }
    const typeId=vehicleTypeResult.rows[0].vehicle_type_id;
    await query(
        'insert into Vehicles (driver_id, vehicle_type_id, plate_number, model, color) values ($1, $2, $3, $4, $5)',
        [userId, typeId, plate_number, model, color]
    )
    return res.status(200).json({msg:'Vehicle registered successfully'});
   }

    const registerAsPassenger=async(req,res)=>{
        const decoded=req.user;
        if(!decoded){
            return res.status(401).json({msg:'Unauthorized: invalid or missing user context from regPassenger'});
        }
        const userId=decoded.userId;

        await query(
            'insert into Passengers (user_id,rating_average,total_distance) values ($1, 0, 0) on conflict (user_id) do nothing',
            [userId]
        )
        const newToken = signToken({userId, username: decoded.username, role: 'passenger'}, {expiresIn: '1d'});
        res.status(200).json({
            msg:'User registered as passenger successfully',
            token:newToken,
            user:{userId, username: decoded.username, role:'passenger'}
        })
    }

    // admin can reject a pending driver application
    const adminRejectDriver = async (req, res) => {
        const adminDecoded = req.user;

        // only admins can reject driver applications
        if (!adminDecoded || adminDecoded.role !== 'admin') {
            return res.status(401).json({ msg: 'Unauthorized: only admins can reject driver applications' });
        }

        const { user_id } = req.body;

        // check that a pending application exists for this user
        const resultPending = await query(
            'SELECT * FROM driver_applications WHERE user_id = $1 AND status = $2',
            [user_id, 'pending']
        );
        if (resultPending.rows.length === 0) {
            return res.status(404).json({ msg: 'No pending driver application found for this user_id' });
        }

        // update the application status to rejected
        await query(
            'UPDATE driver_applications SET status = $1 WHERE user_id = $2',
            ['rejected', user_id]
        );

        return res.status(200).json({
            msg: 'Driver application rejected',
            user: { userId: user_id, status: 'rejected' }
        });
    };

module.exports={registerPage, registerAsAdmin, registerAsDriver, adminApproveDriver, adminRejectDriver, registerVehicle, registerAsPassenger};
//object akare export korle require o object akare kora lagbe
