require("dotenv").config();
const {createUser, comparePass, findstudbyRoll, findstudbyEmail, getStudents} = require("../models/studentModel.js");
const generatetoken = require("../utils/generatetoken.js");
const db = require("../db.js");
const jwt = require("jsonwebtoken");
const registerStud = async(req,res) => {
    try{
    const {roll_no, studname, studemail, studdept, studdiv, studbatch, studepass} = req.body;
    console.log(req.body);
    const isExist = await findstudbyRoll(roll_no);

    if(isExist){
        return res.status(400).json({ error: "Student already registered" });
    }

    const newStud = await createUser({
        roll_no, 
        studname,
        studemail,
        studepass,
        studdept,
        studdiv,
        studbatch,
    });

    res.status(201).json({message:"Registered successfully", student: newStud});
}
catch(err){
    console.error("Error during registration:", err.message);
   res.status(500).json({ error: "Server error during registration", reason: err});
}
}

const loginStud = async(req,res) => {
    try{
    const {studemail, studpass, studdiv, studdept} = req.body;

    const user = await findstudbyEmail(studemail);
    if (!user) {
    return res.status(404).json({ error: "Student not found" });
}

    const isValid = await comparePass(studpass, user.studpass);

    if(!isValid){
        return res.status(401).json({ error: "Invalid password" });
    }

    const token = generatetoken({studname: user.studname ,roll_no: user.roll_no, email: user.studemail, studdept : user.studdept, studdiv : user.studdiv});

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
        student: {
        roll_no: user.roll_no,
        name: user.studname,
        email: user.studemail,
        dept : user.studdept,
        div : user.studdiv
      },

    })
} catch(err){
     console.error("Error during login:", err.message);
    res.status(500).json({ error: "Server error during login" });
}
} 

const logoutStud = async(req,res) => {

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
};

const getProfile = async(req,res) => {
    try{
    const roll_no = req.user.roll_no;
    
    const result = await db.query(
        `select roll_no, studname, studemail, studdept, studdiv, studbatch FROM student_data WHERE roll_no = $1`, [roll_no]
    );

     if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ student: result.rows[0] });
    
  } catch (err) {
    console.error("Error fetching profile:", err.message);
    res.status(500).json({ error: "Server error while fetching profile" });
  }

};



module.exports = {
    registerStud,
    loginStud,
    logoutStud,
    getProfile,
}