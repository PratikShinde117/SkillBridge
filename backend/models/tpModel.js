const bcrypt = require("bcrypt");
const db = require("../db.js");

const createUser = async({tpname, tpemail, tppass, tpdept, tprole}) => {
    const hashPass = await bcrypt.hash(tppass, 10);

  const result = await db.query(
    `insert into tp_user(tpname, tpemail, tppass, tpdept, tprole) 
    values($1,$2,$3,$4,$5) returning*`,[tpname, tpemail, tppass, tpdept, tprole]
  );

  return result.rows[0];
}

const comparePass = async(enteredPass, hashPass) => {
    return await bcrypt.compare(enteredPass, hashPass);
}

const finduserbyEmail = async(studemail) => {
    const result = await db.query(
        `select * from tp_user where tpemail = $1`, [tpemail]
    );
    return result.rows[0];
}

const getEmps = async() => {
     const result = await db.query("select * from tp_user");
     return result.rows;
}

module.exports = {
    createUser,
    comparePass, 
    finduserbyEmail,
    getEmps
}