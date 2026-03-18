const jwt=require('jsonwebtoken');
//env theke secret key nite import kora
require('dotenv').config();

const loginPage=(req,res)=>{
    const {username,password}=req.body;
    if(!username || !password){
        return res.status(400).json({message:'Username and password are required'});
    }
    const token=jwt.sign({username},process.env.JWT_SECRET,{expiresIn:'1h'}) //jwt.sign(payload, secretOrPrivateKey, [options]) eta format 
    //res.send('Login Page');
    res.status(200).json({message:'Login successful',token});
    //res.status(...) only sets the HTTP status code.You must end it with one of these: res.send(...), res.json(...), res.end(...).
}
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
module.exports={loginPage,dashboardPage};