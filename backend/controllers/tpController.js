require("dotenv").config();
const {createUser, comparePass, finduserbyEmail, getEmps} = require("../models/tpModel.js");
const generatetoken = require("../utils/generatetoken.js");
const db = require("../db.js");
const jwt = require("jsonwebtoken");

const registerTP = async(req,res) => {
    try 
    {const {tpname, tpemail, tppass, tpdept, tprole} = req.body;
     const isExist = finduserbyEmail(tpemail);

     if(isExist){
        return res.status(400).json({message : "User already exist"});
     }

     const newUser = new createUser({
        tpname,
        tpemail,
        tppass,
        tpdept,
        tprole
     })

     res.status(201).json({message:"Registered successfully", student: newUser});}

     catch(err){
         res.status(500).json({ error: "Server error during registration", reason: err});
     }
}

const loginUser = async(req, res) => {
    try
   {const {tpemail, tppass} = req.body;

   const isExist = finduserbyEmail(tpemail);

   if(!isExist){
    return res.status(400).json({message : "User not found"});
   }

    const isValid = await comparePass(studpass, user.studpass);

    if(!isValid){
        return res.status(401).json({ error: "Invalid password" });
    }

    const token = generatetoken({tp_name: user.tpname, email: user.tpemail});

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      maxAge: 60 * 60 * 1000, // 1 hour
      sameSite: "Strict",
    });


    res.json({
        success: true,
        message: "Login Successful",
        token,
        User: {
        tp_name: user.tpname,
        email: user.tpemail,
      },

    })}
   catch(err){
    res.status(500).json({ error: "Server error during login" });
   }

}