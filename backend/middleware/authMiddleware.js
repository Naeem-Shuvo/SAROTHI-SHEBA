const jwt =require('jsonwebtoken');
require('dotenv').config();
const { isTokenBlacklisted } = require('./tokenBlacklist');

const authMiddleware=(req,res,next)=>{
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
    try{
        const decoded=jwt.verify(token, process.env.JWT_SECRET);
        
        //token validation, logout kina
        if (isTokenBlacklisted(token)) {
            return res.status(401).json({msg:'Unauthorized: token has been logged out'});
        }
        req.user=decoded; //decoded object with userId, username, role, lvl
        req.token=token;
        next();
    }
    catch(error){
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({msg:'Unauthorized: token expired from authMiddleware'});
        }
        return res.status(401).json({msg:'error caused on Authmidware decoding token'});
    }
}

const requireAdmin = async (decoded, minLevel = 1)=>{
    if(!decoded || decoded.role !== 'admin' || !decoded.lvl || decoded.lvl < minLevel){
        return false;
    }
    const {userId, username, lvl, role}=decoded;
    const result = await query(
        'select * from admins where user_id=$1 and admin_level=$2',
        [userId, lvl]
    );
    return result.rows.length > 0;
}

const requireDriver=(decoded)=>{
    if(decoded.role==='driver'){
        return true;
    }
    const {userId}=decoded;
    // Check if the user has a driver record in the database
    const result = query(
        'SELECT * FROM drivers WHERE user_id = $1',
        [userId]
    );
    return result.rows.length > 0;
}

const requirePassenger=(decoded)=>{
    if(decoded.role==='passenger'){
        return true;
    }
    return false;
}
module.exports={authMiddleware, requireAdmin, requireDriver, requirePassenger};