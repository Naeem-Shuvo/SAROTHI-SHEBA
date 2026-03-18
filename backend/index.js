const express = require('express');
const router=require('./routes/login');
const app=express();

app.use(express.static('../public')); 
app.use(express.json()); //need to be placed before the router
app.use(router);
const port=process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});