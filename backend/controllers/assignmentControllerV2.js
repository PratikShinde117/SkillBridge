require("dotenv").config();
const axios = require("axios");
const db = require("../db");
const aiService = require("../services/aiService");
const scenarioRepo = require("../models/scenarioRepository");
const {
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
} = require("../models/assignmentModel");

const EVALUATION_BASE_URL =
  process.env.EVALUATION_SERVICE_URL || "http://127.0.0.1:8000";

const parseAnswers = (answers) => {
  if (!answers) return {};
  if (typeof answers === "string") {
    try {
      return JSON.parse(answers);
    } catch {
      return {};
    }
  }
  return answers;
};

const normalizeScenarioAnswers = (answers) => {
  const normalized = {};
  const source = parseAnswers(answers);

  if (Array.isArray(source)) {
    source.forEach((item) => {
      if (item?.scenario_id == null || item?.task_id == null) return;
      normalized[`${item.scenario_id}_${item.task_id}`] = item.answer || "";
    });
    return normalized;
  }

  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === "object" && "answer" in value) {
      normalized[String(key)] = value.answer || "";
    } else {
      normalized[String(key)] = value ?? "";
    }
  });

  return normalized;
};

const buildScenarioPayload = (scenario_ids, answers) => {
  const normalizedAnswers = normalizeScenarioAnswers(answers);
  return (scenario_ids || []).map((scenario_id) => {
    const tasks = Object.entries(normalizedAnswers)
      .filter(([key]) => key.startsWith(`${scenario_id}_`))
      .map(([key, value]) => ({
        task_id: Number(key.split("_")[1]),
        answer: value || ""
      }))
      .sort((a, b) => a.task_id - b.task_id);

    return {
      scenario_id: Number(scenario_id),
      answers: tasks
    };
  });
}; 

const ensureStudentAccess = async (assignment_id, roll_no) => {
  const access = await canStudentAccessAssignment(assignment_id, roll_no);
  if (!access.allowed) {
    const error = new Error("You are not allowed to access this assignment");
    error.status = 403;
    throw error;
  }
  return access.assignment;
};

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
      mode
    } = req.body;

    if (!department || !division || year == null) {
      return res.status(400).json({
        error: "Department, division, and year are required"
      });
    }

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
    if (mode === "cache") {
      aiResponse = await aiService.getCachedQuestions(context);
      if (!aiResponse) {
        return res.status(400).json({
          error: "No cached assignment exists. Please generate first."
        });
      }
    } else if (mode === "generate") {
      aiResponse = await aiService.generateQuestions(context);
      await aiService.cacheQuestions(context, aiResponse);
    } else {
      return res.status(400).json({ error: "Invalid generation mode" });
    }

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
      focus_topic,
      assignment_type: "question"
    });

    await db.query(
      `UPDATE assignments
       SET case_study = $1
       WHERE assignment_id = $2`,
      [aiResponse.case_study || null, assignment.assignment_id]
    );

    for (const question of aiResponse.mcqs || []) {
      await addQuestion(assignment.assignment_id, facname, {
        question_text: question.question_text,
        question_type: "mcq",
        options: question.options,
        correct_answer: question.correct_answer,
        difficulty: question.difficulty
      });
    }

    for (const question of aiResponse.descriptive || []) {
      await addQuestion(assignment.assignment_id, facname, {
        question_text: question.question_text,
        question_type: "descriptive",
        expected_points: question.expected_points,
        difficulty: question.difficulty
      });
    }

    const updatedAssignment = await getAssignmentByID(assignment.assignment_id);
    res.json({ success: true, assignment: updatedAssignment });
  } catch (err) {
    console.error("Assignment generation failed:", err);
    res.status(500).json({
      error: err.message || "Assignment generation failed"
    });
  }
};

const addQuestionByFaculty = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const facid = req.faculty.facid;
    const facname = req.faculty.facname;

    const assignment = await getAssignmentByID(assignment_id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (String(assignment.facid) !== String(facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (assignment.assignment_type === "scenario") {
      return res.status(400).json({ error: "Scenario assignments do not accept question rows" });
    }
    if (await isPublished(assignment_id)) {
      return res.status(400).json({ error: "Assignment already published" });
    }

    const question = await addQuestion(assignment_id, facname, req.body);
    res.json({ success: true, question });
  } catch (err) {
    console.error("Add question failed:", err);
    res.status(500).json({ error: "Failed to add question" });
  }
};

const updateQuestionByFaculty = async (req, res) => {
  try {
    const { question_id } = req.params;
    const facid = req.faculty.facid;

    const assignment_id = await getQuestionByQuestionID(question_id);
    if (!assignment_id) {
      return res.status(404).json({ error: "Question not found" });
    }

    const creator = await getFacIDByAssignmentID(assignment_id);
    if (String(creator) !== String(facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (await isPublished(assignment_id)) {
      return res.status(400).json({ error: "Assignment already published" });
    }

    const updated = await updateQuestion(question_id, req.body);
    res.json({ success: true, updated });
  } catch (err) {
    console.error("Update question failed:", err);
    res.status(500).json({ error: "Failed to update question" });
  }
};

const publishAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.body;
    const facid = req.faculty.facid;
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (String(assignment.facid) !== String(facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (assignment.status !== "draft") {
      return res.status(400).json({ error: `Assignment already ${assignment.status}` });
    }

    if (assignment.assignment_type === "scenario") {
      if (!Array.isArray(assignment.scenario_ids) || assignment.scenario_ids.length === 0) {
        return res.status(400).json({ error: "Cannot publish scenario assignment without scenarios" });
      }
    } else {
      const questions = await getQuestionsByAssignment(assignment_id);
      if (!questions.length) {
        return res.status(400).json({ error: "Cannot publish assignment without questions" });
      }
    }

    const published = await updateAssignmentStatus(assignment_id, "published");
    res.json({
      success: true,
      message: "Assignment published successfully",
      assignment: published
    });
  } catch (err) {
    console.error("Publish failed:", err);
    res.status(500).json({ error: "Publish failed" });
  }
};

const removeAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const facid = req.faculty.facid;
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (String(assignment.facid) !== String(facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await deleteAssignment(assignment_id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};

const getAssignmentsForStudentDashboard = async (req, res) => {
  try {
    const student =
      await getStudentByRollNo(req.user.roll_no);
      console.log("STUDENT IN DASHBOARD:", student);
    const assignments = await getAssignmentsForStudent(student || {});
    res.json({ success: true, assignments });
  } catch (err) {
    console.error("Load assignments failed:", err);
    res.status(500).json({ error: "Failed to load assignments" });
  }
};

const startTest = async (req, res) => {
  try {
    const submission = await startAssignment(
      req.params.assignment_id,
      req.user.roll_no
    );

    res.json({
      success: true,
      submission_id: submission.submission_id,
      started_at: submission.started_at,
      duration_minutes: submission.duration_minutes
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

const fetchQuestions = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const roll_no = req.user.roll_no;
    const assignment = await ensureStudentAccess(assignment_id, roll_no);

    if (assignment.assignment_type === "scenario") {
      return res.status(400).json({ error: "Use the scenario endpoint for this assignment" });
    }

    const submission = await getSubmissionByAssignmentAndRollNo(assignment_id, roll_no);
    if (!submission) {
      return res.status(400).json({ error: "Test not started" });
    }
    if (submission.status === "submitted" || submission.status === "auto_submitted") {
      return res.status(400).json({ error: "Test already finished" });
    }

    const expired = await isSubmissionExpired(submission.submission_id);
    if (expired) {
      await db.query(
        `UPDATE assignment_submissions
         SET status = 'auto_submitted',
             submitted_at = NOW()
         WHERE submission_id = $1`,
        [submission.submission_id]
      );
      return res.status(400).json({ error: "Time expired. Test auto-submitted." });
    }

    const questions = await getQuestionsByAssignment(assignment_id);
    res.json({
      success: true,
      submission_id: submission.submission_id,
      started_at: submission.started_at,
      duration_minutes: submission.duration_minutes,
      assignment_type: "question",
      questions: questions.map((question) => ({
        question_id: question.question_id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options,
        difficulty: question.difficulty
      })),
      saved_answers: parseAnswers(submission.answers)
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch questions" });
  }
};

const submitTest = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const roll_no = req.user.roll_no;
    const assignment = await ensureStudentAccess(assignment_id, roll_no);
    const submission = await getSubmissionByAssignmentAndRollNo(assignment_id, roll_no);

    if (!submission) {
      return res.status(400).json({ error: "Test not started" });
    }
    if (submission.status === "submitted" || submission.status === "auto_submitted") {
      return res.status(400).json({ error: "Test already submitted" });
    }

    const answers = req.body.answers || {};
    const serializedAnswers =
      assignment.assignment_type === "scenario"
        ? JSON.stringify(normalizeScenarioAnswers(answers))
        : JSON.stringify(parseAnswers(answers));

    const updated = await submitAssignment(submission.submission_id, serializedAnswers);

    let evaluationResponse;
    if (assignment.assignment_type === "scenario") {
      const scenarios = buildScenarioPayload(assignment.scenario_ids, answers);
      evaluationResponse = await axios.post(`${EVALUATION_BASE_URL}/evaluate-scenario`, {
        assignment_id: Number(assignment_id),
        student_id: roll_no,
        scenarios
      });
    } else {
      const student_answers = {};
      Object.entries(parseAnswers(answers)).forEach(([key, value]) => {
        student_answers[String(key)] = value ?? "";
      });

      evaluationResponse = await axios.post(`${EVALUATION_BASE_URL}/evaluate-question`, {
        assignment_id: Number(assignment_id),
        student_id: roll_no,
        student_answers
      });
    }

    await db.query(
      `UPDATE assignment_submissions
       SET evaluation_result = $1,
           total_score = $2
       WHERE submission_id = $3`,
      [
        JSON.stringify(evaluationResponse.data.evaluation_result),
        Math.round(evaluationResponse.data.evaluation_result?.total_score || 0),
        submission.submission_id
      ]
    );

    res.json({
      success: true,
      status: updated.status,
      submitted_at: updated.submitted_at,
      evaluation_result: evaluationResponse.data.evaluation_result
    });
  } catch (err) {
    console.error("Submission failed:", err.response?.data || err.message);
    res.status(err.status || err.response?.status || 500).json({
      error:
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Submission failed"
    });
  }
};

const saveProgress = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const roll_no = req.user.roll_no;
    const assignment = await ensureStudentAccess(assignment_id, roll_no);
    const submission = await getSubmissionByAssignmentAndRollNo(assignment_id, roll_no);

    if (!submission) {
      return res.status(400).json({ error: "Submission not found" });
    }
    if (submission.status !== "in_progress") {
      return res.status(400).json({ error: "Cannot update answers" });
    }

    const answers =
      assignment.assignment_type === "scenario"
        ? normalizeScenarioAnswers(req.body.answers)
        : parseAnswers(req.body.answers);

    await db.query(
      `UPDATE assignment_submissions
       SET answers = $1
       WHERE submission_id = $2`,
      [JSON.stringify(answers), submission.submission_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Save progress failed:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to save progress" });
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
    if (String(assignment.facid) !== String(facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const questions = await getQuestionsByAssignment(assignment_id);
    res.json({ success: true, questions });
  } catch (err) {
    console.error("Fetch questions for faculty failed:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

const get_assignment_details = async (req, res) => {
  try {
    const details = await getSubmissionDetails(req.user.roll_no);
    res.json({ success: true, details });
  } catch (err) {
    console.error("Submission details failed:", err);
    res.status(500).json({ error: "Failed to fetch submission details" });
  }
};

const getAssignmentBrief = async (req, res) => {
  try {
    const assignment = await ensureStudentAccess(
      req.params.assignment_id,
      req.user.roll_no
    );

    res.json({
      success: true,
      assignment: {
        assignment_id: assignment.assignment_id,
        subject: assignment.subject,
        case_study: assignment.case_study,
        duration_minutes: assignment.duration_minutes,
        total_questions: assignment.total_questions,
        deadline: assignment.deadline,
        department: assignment.department,
        division: assignment.division,
        year: assignment.year,
        assignment_type: assignment.assignment_type || "question",
        scenario_ids: assignment.scenario_ids || []
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Failed to load assignment brief" });
  }
};

const getAssignmentQuestions = async (req, res) => {
  try {
    const assignment = await getAssignmentByID(req.params.assignment_id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (String(assignment.facid) !== String(req.faculty.facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const questions = await getQuestionsByAssignment(req.params.assignment_id);
    res.json({ success: true, questions });
  } catch (err) {
    console.error("Fetch assignment questions failed:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

const getAssignmentsForFaculty = async (req, res) => {
  try {
    const assignments = await getAssignmentsByFaculty(req.faculty.facid);
    res.json({ success: true, assignments });
  } catch (err) {
    console.error("Fetch assignments failed:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

const getFacultyAssignmentDetail = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (String(assignment.facid) !== String(req.faculty.facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (assignment.assignment_type === "scenario") {
      const scenarios = await scenarioRepo.getScenariosByIds(
        assignment.scenario_ids || [],
        req.faculty.facname
      );
      return res.json({ success: true, assignment, scenarios });
    }

    const questions = await getQuestionsByAssignment(assignment_id);
    return res.json({ success: true, assignment, questions });
  } catch (err) {
    console.error("Fetch faculty assignment detail failed:", err);
    res.status(500).json({ error: "Failed to fetch assignment details" });
  }
};

const getAssignmentAnalyticsForFaculty = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (String(assignment.facid) !== String(req.faculty.facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const analytics = await getAssignmentAnalytics(assignment_id);
    return res.json(analytics);
  } catch (err) {
    console.error("Fetch assignment analytics failed:", err);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

const saveAssignmentFeedbackForFaculty = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const feedback = String(req.body?.feedback || "").trim();
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (String(assignment.facid) !== String(req.faculty.facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (!feedback) {
      return res.status(400).json({ error: "Feedback is required" });
    }

    const saved = await saveAssignmentCommonFeedback(assignment_id, feedback);
    return res.json({
      success: true,
      assignment_id: Number(assignment_id),
      common_feedback: saved?.common_feedback || feedback
    });
  } catch (err) {
    console.error("Save assignment feedback failed:", err);
    return res.status(500).json({ error: "Failed to save common feedback" });
  }
};

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
  getAssignmentsForFaculty,
  getFacultyAssignmentDetail,
  getAssignmentAnalyticsForFaculty,
  saveAssignmentFeedbackForFaculty
};
