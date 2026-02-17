const jwt = require("jsonwebtoken");
const db = require("../db");

const facultyAuth = async (req, res, next) => {
  try {
    
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Faculty not authenticated" });

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    
    const check = await db.query(
      "SELECT * FROM token_blacklist WHERE token = $1",
      [token]
    );
    if (check.rows.length > 0)
      return res.status(401).json({ error: "Token revoked" });

    console.log(decoded.email);
    const result = await db.query(
      `SELECT facid, facname, facdept, facdesignation, facsubject, facemail
       FROM teacher_data
       WHERE facemail = $1`,
      [decoded.email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Faculty not found" });

    
    req.faculty = result.rows[0];
    req.token = token;
    next();

  } catch (err) {
    console.error("Faculty auth error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = facultyAuth;
