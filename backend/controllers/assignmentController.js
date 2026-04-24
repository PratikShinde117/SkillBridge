
require("dotenv").config();
const axios = require("axios");
const db = require("../db");

const {
  createAssignment,
  addQuestion,
  updateQuestion,
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
  getSubmissionDetails,
  getAssignmentsByFaculty
} = require("../models/assignmentModel");

const aiService = require("../services/aiService");

const developAssignment = async (req, res) => {

  try {

    const facid = req.faculty.facid;
    const facname = req.faculty.facname;

    const {
      subject,
      syllabus_description,
      difficulty_level,
      total_questions,
      mcq_count,
      descriptive_count,
      department,
      division,
      batch,
      duration_minutes,
      deadline,
      year,
      focus_topic,
      mode   // NEW FIELD
    } = req.body;

    const context = {
      subject,
      syllabus: syllabus_description,
      difficulty: difficulty_level,
      year,
      focus_topic,
      pattern: {
        mcq: mcq_count,
        descriptive: descriptive_count
      }
    };

    let aiResponse;

    // ---------- CACHE MODE ----------
    if (mode === "cache") {

      const cached = await aiService.getCachedQuestions(context);

      if (!cached) {
        return res.status(400).json({
          error:
            "No cached assignment exists. Please generate first."
        });
      }

      aiResponse = cached;

    }

    // ---------- GENERATE MODE ----------
    else if (mode === "generate") {

      aiResponse =
        await aiService.generateQuestions(context);

      await aiService.cacheQuestions(context, aiResponse);

    }

    else {

      return res.status(400).json({
        error: "Invalid generation mode"
      });

    }

    // -------- CREATE ASSIGNMENT --------
    const assignment = await createAssignment({
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
      ai_generated: mode === "generate",
      deadline,
      year,
      focus_topic
    });

    console.log(aiResponse.case_study)
    
    await db.query(
      `UPDATE assignments
       SET case_study = $1
       WHERE assignment_id = $2`,
      [aiResponse.case_study, assignment.assignment_id]
    );


    const updatedAssignment = await getAssignmentByID(
    assignment.assignment_id
);

    // -------- STORE MCQs --------
    for (const q of aiResponse.mcqs) {

      await addQuestion(
        assignment.assignment_id,
        facname,
        {
          question_text: q.question_text,
          question_type: "mcq",
          options: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty
        }
      );

    }

    // -------- STORE DESCRIPTIVE --------
    for (const q of aiResponse.descriptive) {

      await addQuestion(
        assignment.assignment_id,
        facname,
        {
          question_text: q.question_text,
          question_type: "descriptive",
          expected_points: q.expected_points,
          difficulty: q.difficulty
        }
      );

    }

    res.json({
      success: true,
      assignment : updatedAssignment
    });

  }
  catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Assignment generation failed"
    });

  }

};

const addQuestionByFaculty = async (req, res) => {
  try {
    const facid = req.faculty.facid;
    const facname = req.faculty.facname;
    const { assignment_id } = req.params;

    const creator = await getFacIDByAssignmentID(assignment_id);

    if (creator != facid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const published = await isPublished(assignment_id);

    if (published) {
      return res.status(400).json({
        error: "Assignment already published"
      });
    }

    const question = await addQuestion(
      assignment_id,
      facname,
      req.body
    );

    res.json({ success: true, question });
  } catch (err) {
    res.status(500).json({ error: "Failed to add question" });
  }
};

const updateQuestionByFaculty = async (req, res) => {
  try {
    const facid = req.faculty.facid;
    const { question_id } = req.params;

    const assignment_id =
      await getQuestionByQuestionID(question_id);

    const creator = await getFacIDByAssignmentID(
      assignment_id
    );

    if (creator != facid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const published = await isPublished(assignment_id);

    if (published) {
      return res.status(400).json({
        error: "Assignment already published"
      });
    }

    const updated = await updateQuestion(
      question_id,
      req.body
    );

    res.json({ success: true, updated });
  } catch {
    res.status(500).json({
      error: "Failed to update question"
    });
  }
};

const publishAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.body;
    const facid = req.faculty.facid;

    const assignment = await getAssignmentByID(
      assignment_id
    );

    if (!assignment)
      return res.status(404).json({
        error: "Assignment not found"
      });

    if (assignment.facid != facid)
      return res.status(403).json({
        error: "Not authorized"
      });

    const questions = await getQuestionsByAssignment(
      assignment_id
    );

    if (!questions.length)
      return res.status(400).json({
        error: "Assignment has no questions"
      });

    const published =
      await updateAssignmentStatus(
        assignment_id,
        "published"
      );

    res.json({ success: true, assignment: published });
  } catch {
    res.status(500).json({ error: "Publish failed" });
  }
};

const removeAssignment = async (req, res) => {
  try {
    const facid = req.faculty.facid;
    const { assignment_id } = req.params;

    const assignment = await getAssignmentByID(
      assignment_id
    );

    if (assignment.facid != facid)
      return res.status(403).json({
        error: "Not authorized"
      });

    await deleteAssignment(assignment_id);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
};

const getAssignmentsForStudentDashboard =
  async (req, res) => {
    try {
      const div = req.user.studdiv;
      const dept = req.user.studdept;

      const assignments =
        await getAssignmentsForStudent(
          dept,
          div
        );

      res.json({ success: true, assignments });
    } catch {
      res.status(500).json({
        error: "Failed to load assignments"
      });
    }
  };

const startTest = async (req, res) => {
  try {
    const roll_no = req.user.roll_no;
    const { assignment_id } = req.params;

    const submission = await startAssignment(
      assignment_id,
      roll_no
    );

    res.json({
      success: true,
      submission_id: submission.submission_id,
      started_at: submission.started_at,
      duration_minutes: submission.duration_minutes
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
const fetchQuestions = async (req, res) => {
  const { assignment_id } = req.params;
  const roll_no = req.user.roll_no;

  const submission = await db.query(
    `SELECT submission_id, started_at, duration_minutes, status, answers
     FROM assignment_submissions
     WHERE assignment_id = $1 AND roll_no = $2`,
    [assignment_id, roll_no]
  );

  if (!submission.rows.length)
    return res.status(400).json({
      error: "Test not started"
    });

  const data = submission.rows[0];

  const expired = await isSubmissionExpired(
    data.submission_id
  );

  if (expired)
    return res.status(400).json({
      error: "Time expired"
    });

  const questions =
    await getQuestionsByAssignment(
      assignment_id
    );

  // 🔥 Parse saved answers
  const saved_answers =
    typeof data.answers === "string"
      ? JSON.parse(data.answers)
      : data.answers || {};

  res.json({
    success: true,
    submission_id: data.submission_id,
    started_at: data.started_at,
    duration_minutes: data.duration_minutes,
    questions,
    saved_answers   // 👈 IMPORTANT
  });
};

const submitTest = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const { answers, scenario_id } = req.body;
    const roll_no = req.user.roll_no;

    const submission = await db.query(
      `SELECT submission_id
       FROM assignment_submissions
       WHERE assignment_id=$1 AND roll_no=$2`,
      [assignment_id, roll_no]
    );

    const submission_id =
      submission.rows[0].submission_id;

    const updated = await submitAssignment(
      submission_id,
      JSON.stringify(answers)
    );

    // Check assignment type
    const assignment = await getAssignmentByID(assignment_id);

    try {
      if (assignment.assignment_type === "scenario" && scenario_id) {
        // ---- SCENARIO EVALUATION ----
        console.log("🎯 Scenario evaluation for assignment:", assignment_id);
        const evalRes = await axios.post(
          "http://127.0.0.1:8000/evaluate-scenario",
          {
            assignment_id: Number(assignment_id),
            student_id: roll_no,
            scenario_id: Number(scenario_id),
            answers: answers
          }
        );

        console.log("✅ Scenario evaluation successful:", evalRes.data);

        await db.query(
          `UPDATE assignment_submissions
           SET evaluation_result=$1, total_score=$2
           WHERE submission_id=$3`,
          [
            JSON.stringify(evalRes.data.evaluation_result),
            evalRes.data.total_score,
            submission_id
          ]
        );
      } else {
        // ---- QUESTION EVALUATION (original) ----
        const formattedAnswers = {};
        Object.keys(answers).forEach(key => {
          formattedAnswers[String(key)] = answers[key];
        });

        console.log("🔥 Question evaluation for assignment:", assignment_id);

        const evalRes = await axios.post(
          "http://127.0.0.1:8000/evaluate",
          {
            assignment_id: Number(assignment_id),
            student_id: roll_no,
            student_answers: formattedAnswers
          }
        );

        console.log("✅ Evaluation successful:", evalRes.data);

        await db.query(
          `UPDATE assignment_submissions
           SET evaluation_result=$1, total_score=$2
           WHERE submission_id=$3`,
          [
            JSON.stringify(evalRes.data.evaluation_result),
            evalRes.data.total_score,
            submission_id
          ]
        );
      }
    } catch (err) {
      console.log("❌ EVALUATION ERROR:");
      console.log(err.response?.data || err.message);
    }

    res.json({ success: true, status: updated.status });
  } catch {
    res.status(500).json({ error: "Submission failed" });
  }
};

// const saveProgress = async (req, res) => {
//   try {
//     const { assignment_id } = req.params;
//     const { answers } = req.body;
//     const roll_no = req.user.roll_no;

//     const submission = await db.query(
//       `SELECT submission_id
//        FROM assignment_submissions
//        WHERE assignment_id=$1 AND roll_no=$2`,
//       [assignment_id, roll_no]
//     );

//     const submission_id =
//       submission.rows[0].submission_id;

//     await db.query(
//       `UPDATE assignment_submissions
//        SET answers=$1
//        WHERE submission_id=$2`,
//       [JSON.stringify(answers), submission_id]
//     );

//     res.json({ success: true });
//   } catch {
//     res.status(500).json({
//       error: "Failed to save progress"
//     });
//   }
// };



const saveProgress = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const { answers } = req.body;
    const roll_no = req.user.roll_no;

    if (!answers) {
      return res.status(400).json({
        error: "No answers provided"
      });
    }

    const submission = await db.query(
      `SELECT submission_id
       FROM assignment_submissions
       WHERE assignment_id=$1 AND roll_no=$2`,
      [assignment_id, roll_no]
    );

    if (submission.rows.length === 0) {
      return res.status(400).json({
        error: "Submission not found"
      });
    }

    const submission_id = submission.rows[0].submission_id;

    console.log("Saving answers:", answers);

    await db.query(
      `UPDATE assignment_submissions
       SET answers=$1
       WHERE submission_id=$2`,
      [
        typeof answers === "string"
          ? answers
          : JSON.stringify(answers),
        submission_id
      ]
    );

    res.json({ success: true });

  } catch (err) {

    console.error("Save progress error:", err);

    res.status(500).json({
      error: "Failed to save progress"
    });

  }
};



const fetchQuestionsForFaculty = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const facid = req.faculty.facid;

    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (Number(assignment.facid) !== Number(facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const questions = await getQuestionsByAssignment(assignment_id);

    res.json({
      success: true,
      questions
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};



const get_assignment_details = async (req, res) => {
  try {
    const roll = req.user.roll_no;

    const details =
      await getSubmissionDetails(roll);

    res.json({ success: true, details });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
};

const getAssignmentBrief = async (req, res) => {
  try {

    const { assignment_id } = req.params;

    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({
        error: "Assignment not found"
      });
    }

    res.json({
      success: true,
      assignment: {
        assignment_id: assignment.assignment_id,
        subject: assignment.subject,
        case_study: assignment.case_study,
        duration_minutes: assignment.duration_minutes,
        total_questions: assignment.total_questions,
        assignment_type: assignment.assignment_type || "question",
        scenario_ids: assignment.scenario_ids || null
      }
    });

  } catch (err) {

    console.error("Brief fetch error:", err);

    res.status(500).json({
      error: "Failed to load assignment brief"
    });

  }
};

const getAssignmentQuestions = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        console.log(assignment_id);
        const getAssignment = await getQuestionsByAssignment(assignment_id);
        console.log(getAssignment);

        res.json({
            getAssignment
        });
    } catch (err) {
        console.error("Fetch questions error:", err.message);
        res.status(500).json({ error: "Failed to fetch questions" });
    }
}

const getAssignmentsForFaculty = async (req, res) => {
  try{
    const facid = req.faculty.facid;
    const assignments = await getAssignmentsByFaculty(facid);

    res.json({
      success: true,
      assignments
    });
  }catch(err){
    console.error("Fetch assignments error:", err.message);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
}



module.exports = {
  developAssignment,
  addQuestionByFaculty,
  updateQuestionByFaculty,
  publishAssignment,
  removeAssignment,
  getAssignmentsForStudentDashboard,
  startTest,
  fetchQuestions,
  submitTest,
  saveProgress,
  get_assignment_details,
  fetchQuestionsForFaculty,
  getAssignmentQuestions,
  getAssignmentBrief,
  getAssignmentsForFaculty
};