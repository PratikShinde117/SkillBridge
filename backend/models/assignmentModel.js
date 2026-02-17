const bcrypt = require("bcrypt");
const db = require("../db");

const createAssignment = async ({ facid, subject, syllabus_description, difficulty_level, total_questions, mcq_count, descriptive_count, department, division, batch, ai_generated }) => {

  const result = await db.query(`insert into assignments (facid, subject, syllabus_description ,difficulty_level, total_questions, mcq_count, descriptive_count, department,division, batch, ai_generated, status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft') RETURNING *`, [facid, subject, syllabus_description, difficulty_level, total_questions, mcq_count, descriptive_count, department, division, batch, ai_generated]);



  return result.rows[0];
}

const updateAssignmentStatus = async (assignment_id, q_status) => {
  const result = await db.query(`update assignments set status = $1 where assignment_id = $2`, [q_status, assignment_id]);
  return result.rows[0];
}

const getQuestionByQuestionID = async (question_id) => {
  const result = await db.query(`select assignment_id from assignment_questions where question_id = $1`, [question_id]);
  console.log(result.rows[0].assignment_id);
  if (result.rows.length === 0) return null;

  return result.rows[0].assignment_id;
}

const getAssignmentByID = async (assignment_id) => {


  const result = await db.query(`select * from assignments where assignment_id = $1`, [assignment_id]);

  return result.rows[0];
}

const getAssignmentByFaculty = async (facid) => {
  const result = await db.query(`select * from assignments where facid = $1`, [facid]);
  return result.rows[0];
}

const getFacIDByAssignmentID = async (assignment_id) => {
  const result = await db.query(`select facid from assignments where assignment_id = $1`, [assignment_id]);
  console.log(result.rows[0].facid);
  if (result.rows.length === 0) return null;

  return result.rows[0].facid;
}


const deleteAssignment = async (assignment_id) => {
  const result = await db.query(`delete from assignments where assignment_id=$1`, [assignment_id]);
  console.log(result.rows[0]);
  return result.rows[0];
}

const getQuestionsByAssignment = async (assignment_id) => {
  console.log(assignment_id);
  const result = await db.query(`select * from assignment_questions where assignment_id = $1`, [assignment_id]);
  console.log(result.rows);
  return result.rows;

}

const getSubmissionsByAssignment = async (assignment_id) => {
  const result = await db.query(`select * from assignment_submissions where assignment_id = $1`, [assignment_id]);
  return result.rows[0];

}

const getSubmissionsByID = async (submission_id) => {
  const result = await db.query(`select * from assignment_submissions where assignment_id = $1`, [submission_id]);
  return result.rows[0];

}

const getSubmissionByStudent = async (assignment_id, roll_no) => {
  const result = await db.query(`select * from assignment_submissions where assignment_id = $1 AND roll_no = $2`, [submission_id, roll_no]);
  return result.rows[0];
}


const addQuestion = async (assignment_id, facname, questionData) => {
  const {
    question_text,
    question_type,
    options,
    correct_answer,
    expected_points,
    difficulty
  } = questionData;

  const result = await db.query(
    `INSERT INTO assignment_questions
      (assignment_id, question_text, question_type, options, correct_answer, expected_points, difficulty, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      assignment_id,
      question_text,
      question_type,
      options ? JSON.stringify(options) : null,
      correct_answer || null,
      options ? JSON.stringify(options) : null,
      difficulty,
      facname,
    ]
  );

  return result.rows[0];
};


const updateQuestion = async (question_id, updatedQuestion) => {
  const {
    question_text,
    options,
    correct_answer,
    expected_points,
    difficulty
  } = updatedQuestion;

  const result = await db.query(
    `UPDATE assignment_questions
     SET question_text = $1,
         options = $2,
         correct_answer = $3,
         expected_points = $4,
         difficulty = $5
     WHERE question_id = $6
     RETURNING *`,
    [
      question_text,
      options || null,
      correct_answer || null,
      expected_points || null,
      difficulty,
      question_id
    ]
  );

  return result.rows[0];
};


const isPublished = async (assignment_id) => {
  console.log("Before DB query");
  const result = await db.query(`select status from assignments where assignment_id = $1`, [assignment_id]);
  if (result.rows.length === 0) return false;

  console.log(result.rows[0].status);

  return result.rows[0].status === "published";
}

const getAssignmentsForStudent = async (department,division) => {

  console.log(division + " " + department);

  const result = await db.query(`SELECT 
  assignment_id,
  subject,
  facid,
  difficulty_level,
  deadline,
  status,
  duration_minutes
  FROM assignments 
  WHERE
  status = 'published' 
  and department = $1 
  and division = $2
  `
  // LOWER(TRIM(status)) = 'published'
  // AND LOWER(TRIM(department)) = LOWER(TRIM($1))
  // AND LOWER(TRIM(division)) = LOWER(TRIM($2))
  , [department,division]);

  console.log(result.rows);

  return result.rows;



}


const startAssignment = async (assignment_id, roll_no) => {
  
  
  const existing = await db.query(
    `SELECT * FROM assignment_submissions 
     WHERE assignment_id = $1 AND roll_no = $2`,
    [assignment_id, roll_no]
  );

  console.log(existing.rows);

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Get assignment duration
  const assignment = await db.query(
    `SELECT duration_minutes FROM assignments 
     WHERE assignment_id = $1 AND status = 'published'`,
    [assignment_id]
  );

  

  if (assignment.rows.length === 0) {
    throw new Error("Assignment not available");
  }

  const duration = assignment.rows[0].duration_minutes;

  const result = await db.query(
    `INSERT INTO assignment_submissions
     (assignment_id, roll_no, started_at, duration_minutes, status)
     VALUES ($1, $2, NOW(), $3, 'in_progress')
     RETURNING *`,
    [assignment_id, roll_no, duration]
  );

  return result.rows[0];
}



const isSubmissionExpired = async (submission_id) => {
  const result = await db.query(
    `SELECT started_at, duration_minutes 
     FROM assignment_submissions 
     WHERE submission_id = $1`,
    [submission_id]
  );

  if (result.rows.length === 0) return true;

  const { started_at, duration_minutes } = result.rows[0];
  const endTime = new Date(started_at);
  endTime.setMinutes(endTime.getMinutes() + duration_minutes);

  return new Date() > endTime;
};


const submitAssignment = async (submission_id, answers) => {
  const expired = await isSubmissionExpired(submission_id);

  const status = expired ? "auto_submitted" : "submitted";

  const result = await db.query(
    `UPDATE assignment_submissions
     SET submitted_at = NOW(),
         answers = $1,
         status = $2
     WHERE submission_id = $3
     RETURNING *`,
    [answers, status, submission_id]
  );

  return result.rows[0];
};



const getSubmissionDetails = async(roll_no) => {
  const get_details = await db.query(
    `select * from assignment_submissions
     where roll_no = $1
    `,
    [roll_no]
  );


  return get_details.rows;
}


module.exports = {
  createAssignment,
  updateQuestion,
  addQuestion,
  getQuestionsByAssignment,
  getAssignmentByID,
  updateAssignmentStatus,
  deleteAssignment,
  isPublished,
  getQuestionByQuestionID,
  getFacIDByAssignmentID,
  getAssignmentsForStudent,
  startAssignment,
  isSubmissionExpired,
  submitAssignment,
  getSubmissionDetails

}




