const jwt=require('jsonwebtoken');
//env theke secret key nite import kora
require('dotenv').config();
const { query } = require('../../database/db');
const crypto=require('crypto');

const registerPage=async (req,res)=>{
    const {username,email,phone_number,password}=req.body;
    if(!username || !email || !phone_number || !password){
        return res.status(400).json({msg:'All fields are required'});
    }
    try{
        const queryResult=await query(
            'SELECT * FROM users WHERE email=$1 OR phone_number=$2',
            [email,phone_number]
        )
        if(queryResult.rows.length>0){
            return res.status(400).json({msg:'User already exists with this email or phone number'});
        }

        const hashedPass=crypto.createHash('sha256').update(password).digest('hex');
        const insertResult=await query(
            'INSERT INTO users (name,email,phone_number,password_hash) VALUES ($1,$2,$3,$4) RETURNING user_id, name',
            //returns rows = [{ user_id: 123 }]
            //{} er moddhe rows, and joto rows sob array akare pass kore
            [username,email,phone_number,hashedPass]
        )

        const userInfo={user_id: insertResult.rows[0].user_id, name: insertResult.rows[0].name};
        const token= jwt.sign(
            {userId: userInfo.user_id, username: userInfo.name},
            process.env.JWT_SECRET,
            {expiresIn: '1h'}
        )
        res.status(201).json({
            msg:'User registered successfully',
            token,
            user:userInfo
        })
    } catch (error) {
        console.error('Error occurred while registering user:', error.message);
        return res.status(500).json({msg:'Internal server error'});
    }

}
module.exports={registerPage};
//object akare export korle require o object akare kora lagbe