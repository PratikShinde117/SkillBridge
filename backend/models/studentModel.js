
const bcrypt = require("bcrypt");
const db = require("../db.js");


const createUser = async({roll_no, studname, studemail, studepass, studdept, studdiv, studbatch, student_year}) =>{
   
  const hashPass = await bcrypt.hash(studepass, 10);

  const result = await db.query(
    `insert into student_data(roll_no, studname, studemail, studdept, studdiv, studbatch, studpass, student_year) 
    values($1,$2,$3,$4,$5,$6,$7,$8) returning*`,[roll_no, studname, studemail, studdept, studdiv, studbatch,hashPass, student_year]
  );

  return result.rows[0];

}

const comparePass = async(enteredPass, hashPass) => {
    return await bcrypt.compare(enteredPass, hashPass);
}

const findstudbyRoll = async(roll_no) => {
    const result = await db.query(
        `select * from student_data where roll_no = $1`, [roll_no]
    );
  
    return result.rows[0];
}

const findstudbyEmail = async(studemail) => {
    const result = await db.query(
        `select * from student_data where studemail = $1`, [studemail]
    );
    return result.rows[0];
}
const getStudents = async() => {
     const result = await db.query("select * from student_data");
     return result.rows;
}

module.exports = {
    createUser,
    comparePass,
    findstudbyRoll,
    findstudbyEmail,
    getStudents,
};
