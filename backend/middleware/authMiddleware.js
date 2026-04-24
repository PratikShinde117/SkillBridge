const jwt = require("jsonwebtoken");
const db = require("../db.js"); 

let studentYearColumnCache;

const getStudentYearColumn = async () => {
  if (studentYearColumnCache !== undefined) {
    return studentYearColumnCache;
  }

  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'student_data'
       AND column_name IN ('studyear', 'year')
     ORDER BY CASE column_name WHEN 'studyear' THEN 1 ELSE 2 END
     LIMIT 1`
  );

  studentYearColumnCache = result.rows[0]?.column_name || null;
  return studentYearColumnCache;
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token ||
      req.headers.authorization?.split(" ")[1]; 
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      "SELECT * FROM token_blacklist WHERE token = $1",
      [token]
    );

    if (result.rows.length > 0)
      return res.status(401).json({ error: "Token is blacklisted" });

    req.user = decoded;

    const yearColumn = await getStudentYearColumn();
    const yearSelect = yearColumn ? `, ${yearColumn} AS student_year` : ", NULL AS student_year";
    const studentResult = await db.query(
      `SELECT roll_no, studname, studemail, studdept, studdiv, studbatch ${yearSelect}
       FROM student_data 
       WHERE studemail = $1`,
      [decoded.email]
    );

    if (studentResult.rows.length > 0) {
      req.student = studentResult.rows[0]; 
    }
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;
