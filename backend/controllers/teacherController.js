require("dotenv").config();
const { createFaculty, comparePass, getFacultybyemail, getallfaculties} = require("../models/teacherModel");
const generatetoken = require("../utils/generatetoken.js");
const db = require("../db.js");
const jwt = require("jsonwebtoken");


const registerFac = async(req,res) => {
   try {const {facid, facname, facdept, facpass ,facdesignation, facsubject, facemail} = req.body;

    const isExist = await getFacultybyemail(facemail);

    if(isExist){
         return res.status(400).json({error : "Faculty already registered"});
    }



    const newFac = await createFaculty({
        facid, 
        facname, 
        facdept, 
        facpass ,
        facdesignation, 
        facsubject, 
        facemail
    });

     res.status(201).json({message:"Registered successfully!", student: newFac});}

     catch(err){
        console.error("Error during registration:", err.message);
        res.status(500).json({ error: "Server error during registration", reason: err});
     }
}

const loginFac = async(req,res) => {
   try{
    const {facpass, facemail, facname} = req.body;
    if(!facpass || !facemail || !facname){
       return res.status(400).json({error : "Enter all fields"});
    }

    const faculty = await getFacultybyemail(facemail);

    if(!faculty){
       return res.status(400).json({error : "Faculty not registered yet!"});
    }

    const isValid = await comparePass(facpass, faculty.facpass);

    if(!isValid){
        return res.status(401).json({ error: "Invalid password" });
    }

    const token = generatetoken({id : faculty.facid , email : faculty.facemail, faculty_name : faculty.facname});

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      maxAge: 60 * 60 * 1000, 
      sameSite: "Strict",
    });

    res.json({
        success: true,
        message: "Login Successful",
        token,
        Faculty : {
            facid : faculty.facid,
            facname : faculty.facname,
            facemail : faculty.facemail

        }
    });
}
catch(err){
     res.status(500).json({ error: "Server error during registration", reason: err});
}
}

const logoutFac = async(req,res) => {
    try {
    const token = req.cookies?.token;
    if (!token) return res.status(400).json({ error: "No token provided" });

    await db.query(
  "INSERT INTO token_blacklist(token, expires_at) VALUES($1, NOW() + interval '1 hour')",
  [token]
);


    res.clearCookie("token");

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ error: "Server error during logout" });
  }
}

const getProfileFac = async(req,res) => {
    try{
        
        const faculty = req.faculty;

        return res.json({ faculty });
    
  } catch (err) {
    console.error("Error fetching profile:", err.message);
    res.status(500).json({ error: "Server error while fetching profile" });
  }
    
}

module.exports = {
    registerFac,
    loginFac,
    logoutFac,
    getProfileFac
}