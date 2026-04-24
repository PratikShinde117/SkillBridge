const bcrypt = require("bcrypt");
const db = require("../db");

const createFaculty = async ({facid, facname, facdept, facpass ,facdesignation, facsubject, facemail}) =>{
    const hashP = await bcrypt.hash(facpass,10);

    const res = await db.query(`insert into teacher_data(facid, facname, facdept, facpass ,facdesignation, facsubject, facemail) values($1,$2,$3,$4,$5,$6,$7)`, [facid, facname, facdept, hashP ,facdesignation, facsubject, facemail]);

    return res.rows[0];


}

const comparePass = async(enteredPass, storedPass)=>{
    return await bcrypt.compare(enteredPass, storedPass);
    
}

const getFacultybyemail = async(enteredEmail) => {
    const result = await db.query(`select * from teacher_data where facemail = $1`,[enteredEmail]);
    return result.rows[0];
}

const getallfaculties = async() => {
    const fac_data = await db.query("select * from teacher_data");
    return fac_data.rows;
}


module.exports = {
    createFaculty,
    comparePass,
    getFacultybyemail,
    getallfaculties
}
