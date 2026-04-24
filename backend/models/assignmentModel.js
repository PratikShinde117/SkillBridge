

const db = require("../db");



const normalizeJson = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};


const getStudentByRollNo = async (roll_no) => {
  const result = await db.query(
    `SELECT 
        roll_no, 
        studname, 
        studemail, 
        studdept, 
        studdiv, 
        studbatch,
        student_year
     FROM student_data
     WHERE roll_no = $1`,
    [roll_no]
  );

  console.log("DB STUDENT:", result.rows[0]);

  return result.rows[0] || null;
};
const getAssignmentByID = async (assignment_id) => {
  const result = await db.query(
    `SELECT *
     FROM assignments
     WHERE assignment_id = $1`,
    [assignment_id]
  );

  const assignment = result.rows[0];
  if (!assignment) return null;

  return {
    ...assignment,
    assignment_type: assignment.assignment_type || "question",
    scenario_ids: normalizeJson(assignment.scenario_ids, [])
  };
};

const getSubmissionByAssignmentAndRollNo = async (assignment_id, roll_no) => {
  const result = await db.query(
    `SELECT *
     FROM assignment_submissions
     WHERE assignment_id = $1 AND roll_no = $2`,
    [assignment_id, roll_no]
  );

  return result.rows[0] || null;
};

const canStudentAccessAssignment = async (assignment_id, roll_no) => {
  const [assignment, student] = await Promise.all([
    getAssignmentByID(assignment_id),
    getStudentByRollNo(roll_no)
  ]);

  // ❌ Missing data
  if (!assignment || !student) {
    return { allowed: false, assignment, student };
  }

  // ✅ Normalize values
  const studentYear =
    student.student_year != null ? Number(student.student_year) : null;
  const assignmentYear =
    assignment.year != null ? Number(assignment.year) : null;

  const studentDept = String(student.studdept || "").trim().toLowerCase();
  const assignmentDept = String(assignment.department || "").trim().toLowerCase();

  const studentDiv = String(student.studdiv || "").trim().toLowerCase();
  const assignmentDiv = String(assignment.division || "").trim().toLowerCase();

  const status = String(assignment.status || "").toLowerCase();

  // 🔍 Debug (VERY IMPORTANT — keep during testing)
  console.log("ACCESS CHECK:", {
    studentYear,
    assignmentYear,
    studentDept,
    assignmentDept,
    studentDiv,
    assignmentDiv,
    status
  });

  // ✅ Final access logic
  const allowed =
    status === "published" &&
    studentYear !== null &&
    assignmentYear !== null &&
    studentYear === assignmentYear &&
    studentDept === assignmentDept &&
    studentDiv === assignmentDiv;

  return { allowed, assignment, student };
};

const createAssignment = async ({
  facid,
  subject,
  syllabus_description,
  difficulty_level,
  total_questions,
  mcq_count,
  descriptive_count,
  duration_minutes,
  department,
  division,
  batch,
  ai_generated,
  deadline,
  year,
  focus_topic,
  assignment_type = "question",
  scenario_ids = null
}) => {
  const result = await db.query(
    `INSERT INTO assignments
     (facid,
      subject,
      syllabus_description,
      difficulty_level,
      total_questions,
      mcq_count,
      descriptive_count,
      department,
      division,
      batch,
      ai_generated,
      status,
      duration_minutes,
      deadline,
      year,
      focus_topic,
      case_study,
      assignment_type,
      scenario_ids)
     VALUES
     ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12,$13,$14,$15,NULL,$16,$17)
     RETURNING *`,
    [
      facid,
      subject,
      syllabus_description,
      difficulty_level,
      total_questions,
      mcq_count,
      descriptive_count,
      department,
      division,
      batch,
      ai_generated,
      duration_minutes,
      deadline,
      year,
      focus_topic,
      assignment_type,
      scenario_ids ? JSON.stringify(scenario_ids) : null
    ]
  );

  return result.rows[0];
};

const addQuestion = async (assignment_id, facname, data) => {
  const {
    question_text,
    question_type,
    options,
    correct_answer,
    expected_points,
    difficulty
  } = data;

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
      expected_points ? JSON.stringify(expected_points) : null,
      difficulty || null,
      facname
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
      options ? JSON.stringify(options) : null,
      correct_answer || null,
      expected_points ? JSON.stringify(expected_points) : null,
      difficulty || null,
      question_id
    ]
  );

  return result.rows[0];
};

const getQuestionsByAssignment = async (assignment_id) => {
  const result = await db.query(
    `SELECT *
     FROM assignment_questions
     WHERE assignment_id = $1
     ORDER BY question_id`,
    [assignment_id]
  );

  return result.rows.map((row) => ({
    ...row,
    options: normalizeJson(row.options, row.options),
    expected_points: normalizeJson(row.expected_points, row.expected_points)
  }));
};

const getQuestionByQuestionID = async (question_id) => {
  const result = await db.query(
    `SELECT assignment_id
     FROM assignment_questions
     WHERE question_id = $1`,
    [question_id]
  );

  return result.rows[0]?.assignment_id || null;
};



const getFacIDByAssignmentID = async (assignment_id) => {
  const result = await db.query(
    `SELECT facid
     FROM assignments
     WHERE assignment_id = $1`,
    [assignment_id]
  );

  return result.rows[0]?.facid || null;
};

const updateAssignmentStatus = async (assignment_id, status) => {
  const result = await db.query(
    `UPDATE assignments
     SET status = $1
     WHERE assignment_id = $2
     RETURNING *`,
    [status, assignment_id]
  );

  return result.rows[0] || null;
};

const deleteAssignment = async (assignment_id) => {
  await db.query(
    `DELETE FROM assignments
     WHERE assignment_id = $1`,
    [assignment_id]
  );
};

const isPublished = async (assignment_id) => {
  const result = await db.query(
    `SELECT status
     FROM assignments
     WHERE assignment_id = $1`,
    [assignment_id]
  );

  return result.rows[0]?.status === "published";
};

const getAssignmentsForStudent = async (student) => {
  const studentYear =
    student.student_year != null ? Number(student.student_year) : null;

  const studentDept = String(student.studdept || "").trim().toLowerCase();
  const studentDiv = String(student.studdiv || "").trim().toLowerCase();

  console.log("STUDENT INFO:", { studentYear, studentDept, studentDiv });

  if (!studentYear || !studentDept || !studentDiv) {
    console.log("Invalid student data:", { studentYear, studentDept, studentDiv });
    return [];
  }

  console.log("FILTERING WITH:", {
    year: studentYear,
    dept: studentDept,
    div: studentDiv
  });

  const result = await db.query(
    `SELECT *
     FROM assignments
     WHERE LOWER(status) = 'published'
       AND year = $1
       AND LOWER(TRIM(department)) = $2
       AND LOWER(TRIM(division)) = $3
     ORDER BY created_at DESC`,
    [studentYear, studentDept, studentDiv]
  );

  console.log("ASSIGNMENTS FOUND:", result.rows.length);

  return result.rows.map((row) => ({
    ...row,
    assignment_type: row.assignment_type || "question",
    scenario_ids: normalizeJson(row.scenario_ids, [])
  }));
};

const startAssignment = async (assignment_id, roll_no) => {
  const access = await canStudentAccessAssignment(assignment_id, roll_no);
  if (!access.allowed) {
    const error = new Error("You are not allowed to access this assignment");
    error.status = 403;
    throw error;
  }

  const existing = await getSubmissionByAssignmentAndRollNo(assignment_id, roll_no);
  if (existing) {
    return existing;
  }

  const result = await db.query(
    `INSERT INTO assignment_submissions
     (assignment_id, roll_no, started_at, duration_minutes, status)
     VALUES ($1, $2, NOW(), $3, 'in_progress')
     RETURNING *`,
    [assignment_id, roll_no, access.assignment.duration_minutes]
  );

  return result.rows[0];
};

const isSubmissionExpired = async (submission_id) => {
  const result = await db.query(
    `SELECT NOW() > (started_at + (duration_minutes * INTERVAL '1 minute')) AS expired
     FROM assignment_submissions
     WHERE submission_id = $1`,
    [submission_id]
  );

  return result.rows[0]?.expired === true;
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

const getSubmissionDetails = async (roll_no) => {
  const result = await db.query(
    `SELECT submission_id,
            assignment_id,
            roll_no,
            total_score,
            started_at,
            submitted_at,
            duration_minutes,
            status
     FROM assignment_submissions
     WHERE roll_no = $1
     ORDER BY started_at DESC`,
    [roll_no]
  );

  return result.rows;
};

const getAssignmentsByFaculty = async (facid) => {
  const result = await db.query(
    `SELECT *
     FROM assignments
     WHERE facid = $1
     ORDER BY created_at DESC`,
    [facid]
  );

  return result.rows.map((row) => ({
    ...row,
    assignment_type: row.assignment_type || "question",
    scenario_ids: normalizeJson(row.scenario_ids, [])
  }));
};

const getAssignmentAnalytics = async (assignment_id) => {
  const assignment = await getAssignmentByID(assignment_id);
  if (!assignment) {
    return null;
  }

  const totalStudentsResult = await db.query(
    `SELECT COUNT(*)::int AS total_students
     FROM student_data
     WHERE LOWER(TRIM(studdept)) = LOWER(TRIM($1))
       AND LOWER(TRIM(studdiv)) = LOWER(TRIM($2))
       AND student_year = $3`,
    [assignment.department, assignment.division, assignment.year]
  );

  const submissionStatsResult = await db.query(
    `SELECT
        COUNT(*)::int AS attempted,
        COALESCE(ROUND(AVG(total_score)::numeric, 2), 0) AS average_score,
        COALESCE(MAX(total_score), 0) AS highest_score,
        COALESCE(MIN(total_score), 0) AS lowest_score
     FROM assignment_submissions
     WHERE assignment_id = $1
       AND status IN ('submitted', 'auto_submitted')`,
    [assignment_id]
  );

  const studentsResult = await db.query(
    `SELECT
        s.roll_no,
        sd.studname AS name,
        COALESCE(s.total_score, 0) AS score,
        s.status,
        s.evaluation_result
     FROM assignment_submissions s
     JOIN student_data sd ON sd.roll_no = s.roll_no
     WHERE s.assignment_id = $1
       AND s.status IN ('submitted', 'auto_submitted')
     ORDER BY COALESCE(s.total_score, 0) DESC, sd.studname ASC`,
    [assignment_id]
  );

  const stats = submissionStatsResult.rows[0] || {};
  const total_students = totalStudentsResult.rows[0]?.total_students || 0;
  const attempted = stats.attempted || 0;
  const maxScore = studentsResult.rows.reduce((highest, row) => {
    const parsed =
      typeof row.evaluation_result === "string"
        ? normalizeJson(row.evaluation_result, {})
        : row.evaluation_result || {};
    const candidate = Number(parsed?.max_score || 0);
    return candidate > highest ? candidate : highest;
  }, 0);
  const distributionSourceMax = maxScore > 0 ? maxScore : 20;
  const bucketSize = Math.max(Math.ceil(distributionSourceMax / 4), 1);
  const buckets = Array.from({ length: 4 }, (_, index) => {
    const start = index * bucketSize;
    const end =
      index === 3 ? distributionSourceMax : Math.min((index + 1) * bucketSize - 1, distributionSourceMax);

    return {
      range: `${start}-${end}`,
      count: 0
    };
  });

  const students = studentsResult.rows.map((row) => {
    const evaluation =
      typeof row.evaluation_result === "string"
        ? normalizeJson(row.evaluation_result, {})
        : row.evaluation_result || {};
    const score = Number(row.score || 0);
    const max_score = Number(evaluation?.max_score || 0);
    const percentage =
      max_score > 0
        ? Number(((score / max_score) * 100).toFixed(2))
        : Number(evaluation?.percentage || 0);

    const bucketIndex =
      score >= distributionSourceMax
        ? buckets.length - 1
        : Math.min(Math.floor(score / bucketSize), buckets.length - 1);

    if (buckets[bucketIndex]) {
      buckets[bucketIndex].count += 1;
    }

    return {
      roll_no: row.roll_no,
      name: row.name,
      score,
      percentage,
      status: row.status
    };
  });

  return {
    assignment_id: assignment.assignment_id,
    subject: assignment.subject,
    common_feedback: assignment.common_feedback || "",
    total_students,
    attempted,
    not_attempted: Math.max(total_students - attempted, 0),
    average_score: Number(stats.average_score || 0),
    highest_score: Number(stats.highest_score || 0),
    lowest_score: attempted > 0 ? Number(stats.lowest_score || 0) : 0,
    score_distribution: buckets,
    students
  };
};

const saveAssignmentCommonFeedback = async (assignment_id, common_feedback) => {
  const result = await db.query(
    `UPDATE assignments
     SET common_feedback = $1
     WHERE assignment_id = $2
     RETURNING assignment_id, common_feedback`,
    [common_feedback, assignment_id]
  );

  return result.rows[0] || null;
};

module.exports = {
  canStudentAccessAssignment,
  createAssignment,
  addQuestion,
  updateQuestion,
  getQuestionsByAssignment,
  getQuestionByQuestionID,
  getAssignmentByID,
  updateAssignmentStatus,
  deleteAssignment,
  isPublished,
  getFacIDByAssignmentID,
  getAssignmentsForStudent,
  startAssignment,
  isSubmissionExpired,
  submitAssignment,
  getSubmissionDetails,
  getAssignmentsByFaculty,
  getSubmissionByAssignmentAndRollNo,
  getStudentByRollNo,
  getAssignmentAnalytics,
  saveAssignmentCommonFeedback
};

