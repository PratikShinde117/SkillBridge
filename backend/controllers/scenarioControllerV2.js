require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const scenarioRepo = require("../models/scenarioRepository");
const {
  getAssignmentByID,
  updateAssignmentStatus,
  canStudentAccessAssignment,
  getSubmissionByAssignmentAndRollNo,
  isSubmissionExpired
} = require("../models/assignmentModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseAnswers = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

const ensureFacultyOwnsScenarios = async (scenario_ids, facname) => {
  const scenarios = await scenarioRepo.getScenariosByIds(scenario_ids, facname);
  return scenarios.length === scenario_ids.length;
};

const searchScenarios = async (req, res) => {
  try {
    const { subject, year_level, concepts } = req.query;
    const conceptsArr = concepts
      ? concepts.split(",").map((concept) => concept.trim().toLowerCase()).filter(Boolean)
      : null;

    const scenarios = await scenarioRepo.searchScenarios({
      subject: subject || null,
      year_level: year_level ? Number(year_level) : null,
      concepts: conceptsArr,
      created_by: req.faculty.facname
    });

    res.json({ success: true, scenarios });
  } catch (err) {
    console.error("Search scenarios failed:", err);
    res.status(500).json({ error: "Failed to search scenarios" });
  }
};

const getAllScenarios = async (req, res) => {
  try {
    const scenarios = await scenarioRepo.getAllScenarios(req.faculty.facname);
    res.json({ success: true, scenarios });
  } catch (err) {
    console.error("Get all scenarios failed:", err);
    res.status(500).json({ error: "Failed to fetch scenarios" });
  }
};

const getScenarioDetail = async (req, res) => {
  try {
    const scenario = await scenarioRepo.getScenarioById(
      req.params.scenario_id,
      req.faculty.facname
    );

    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    res.json({ success: true, scenario });
  } catch (err) {
    console.error("Get scenario failed:", err);
    res.status(500).json({ error: "Failed to fetch scenario" });
  }
};

const generateScenario = async (req, res) => {
  try {
    const { subject, year_level, difficulty_level, topic, additional_instructions } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Subject is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are an expert academic scenario designer. Generate a realistic, industry-relevant scenario for a college assignment.

PARAMETERS:
- Subject: ${subject}
- Year Level: ${year_level || 3}
- Difficulty: ${difficulty_level || "medium"}
- Focus Topic: ${topic || "general"}
${additional_instructions ? `- Additional Instructions: ${additional_instructions}` : ""}

RULES:
1. Return valid JSON only.
2. Use this structure exactly:
{
  "title": "Scenario Title",
  "scenario_json": {
    "context": {
      "domain": "Industry/Domain name",
      "description": "Detailed real-world scenario description (3-5 sentences)",
      "scale": "Scale metrics"
    },
    "problem_statement": "Clear problem statement",
    "tasks": [
      {
        "task_id": 1,
        "title": "Task title",
        "description": "Task description",
        "marks": 5,
        "expected_concepts": ["concept1", "concept2", "concept3", "concept4"]
      }
    ]
  },
  "concepts": ["all", "unique", "concepts"]
}
3. Generate exactly 3 tasks, each worth 5 marks.
4. Each task must have 4 to 6 expected_concepts in lowercase.
5. Do not include markdown fences or explanations.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const generated = JSON.parse(text);

    res.json({
      success: true,
      generated: {
        title: generated.title || `${subject} Scenario`,
        scenario_json: generated.scenario_json,
        concepts: generated.concepts || [],
        subject,
        year_level: year_level || 3,
        difficulty_level: difficulty_level || "medium"
      }
    });
  } catch (err) {
    console.error("Generate scenario failed:", err);
    res.status(500).json({ error: "Failed to generate scenario" });
  }
};

const modifyScenario = async (req, res) => {
  try {
    const { scenario_json, instructions } = req.body;

    if (!scenario_json || !instructions) {
      return res.status(400).json({
        error: "Both scenario_json and instructions are required"
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
Modify this academic scenario JSON according to the faculty instructions.

SCENARIO:
${JSON.stringify(scenario_json, null, 2)}

INSTRUCTIONS:
${instructions}

RULES:
1. Keep the same JSON structure.
2. Each task must preserve task_id, title, description, marks, expected_concepts.
3. Output JSON only with no markdown.
`;

    const result = await model.generateContent(prompt);
    const modified = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
    res.json({ success: true, modified_scenario: modified });
  } catch (err) {
    console.error("Modify scenario failed:", err);
    res.status(500).json({ error: "Failed to modify scenario" });
  }
};

const saveScenario = async (req, res) => {
  try {
    const scenario = await scenarioRepo.createScenario({
      ...req.body,
      created_by: req.faculty.facname
    });

    res.json({ success: true, scenario });
  } catch (err) {
    console.error("Save scenario failed:", err);
    res.status(500).json({ error: "Failed to save scenario" });
  }
};

const updateScenario = async (req, res) => {
  try {
    const scenario = await scenarioRepo.updateScenario(
      req.params.scenario_id,
      req.body,
      req.faculty.facname
    );

    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    res.json({ success: true, scenario });
  } catch (err) {
    console.error("Update scenario failed:", err);
    res.status(500).json({ error: "Failed to update scenario" });
  }
};

const deleteScenario = async (req, res) => {
  try {
    const deleted = await scenarioRepo.deleteScenario(
      req.params.scenario_id,
      req.faculty.facname
    );

    if (!deleted) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    res.json({ success: true, deleted: deleted.scenario_id });
  } catch (err) {
    console.error("Delete scenario failed:", err);
    res.status(500).json({ error: "Failed to delete scenario" });
  }
};

const createScenarioAssignment = async (req, res) => {
  try {
    const {
      subject,
      department,
      division,
      batch,
      year,
      duration_minutes,
      deadline,
      difficulty_level,
      scenario_ids
    } = req.body;
    const normalizedYear = year != null && year !== "" ? Number(year) : null;
    const normalizedDuration =
      duration_minutes != null && duration_minutes !== ""
        ? Number(duration_minutes)
        : null;

    if (!Array.isArray(scenario_ids) || scenario_ids.length === 0) {
      return res.status(400).json({ error: "At least one scenario must be selected" });
    }

    if (!subject || !department || !division || normalizedYear == null) {
      return res.status(400).json({
        error: "Subject, department, division, and year are required"
      });
    }

    const ownsAllScenarios = await ensureFacultyOwnsScenarios(
      scenario_ids.map(Number),
      req.faculty.facname
    );

    if (!ownsAllScenarios) {
      return res.status(403).json({ error: "One or more selected scenarios do not belong to this faculty" });
    }

    const assignment = await scenarioRepo.createScenarioAssignment({
      facid: req.faculty.facid,
      subject,
      department,
      division,
      batch,
      year: normalizedYear,
      duration_minutes: normalizedDuration,
      deadline,
      difficulty_level,
      scenario_ids: scenario_ids.map(Number)
    });

    res.json({ success: true, assignment });
  } catch (err) {
    console.error("Create scenario assignment failed:", err);
    res.status(500).json({
      error: err.message || "Failed to create assignment"
    });
  }
};

const publishScenarioAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.body;
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    if (String(assignment.facid) !== String(req.faculty.facid)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (assignment.assignment_type !== "scenario") {
      return res.status(400).json({ error: "Not a scenario assignment" });
    }
    if (!Array.isArray(assignment.scenario_ids) || assignment.scenario_ids.length === 0) {
      return res.status(400).json({ error: "No scenarios attached" });
    }
    if (assignment.status !== "draft") {
      return res.status(400).json({ error: `Assignment already ${assignment.status}` });
    }

    const published = await updateAssignmentStatus(assignment_id, "published");
    res.json({ success: true, assignment: published });
  } catch (err) {
    console.error("Publish scenario assignment failed:", err);
    res.status(500).json({ error: "Failed to publish assignment" });
  }
};

const getScenariosForStudent = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const access = await canStudentAccessAssignment(assignment_id, req.user.roll_no);

    if (!access.allowed) {
      return res.status(403).json({ error: "You are not allowed to access this assignment" });
    }

    const assignment = access.assignment;
    if (assignment.assignment_type !== "scenario") {
      return res.status(400).json({ error: "Not a scenario assignment" });
    }

    const submission = await getSubmissionByAssignmentAndRollNo(assignment_id, req.user.roll_no);
    if (!submission) {
      return res.status(400).json({ error: "Test not started" });
    }
    if (submission.status === "submitted" || submission.status === "auto_submitted") {
      return res.status(400).json({ error: "Test already finished" });
    }

    const expired = await isSubmissionExpired(submission.submission_id);
    if (expired) {
      return res.status(400).json({ error: "Time expired. Test auto-submitted." });
    }

    const scenarios = await scenarioRepo.getScenariosByIds(
      assignment.scenario_ids || []
    );

    res.json({
      success: true,
      submission_id: submission.submission_id,
      started_at: submission.started_at,
      duration_minutes: submission.duration_minutes,
      saved_answers: parseAnswers(submission.answers),
      assignment: {
        assignment_id: assignment.assignment_id,
        subject: assignment.subject,
        duration_minutes: assignment.duration_minutes,
        deadline: assignment.deadline,
        assignment_type: assignment.assignment_type
      },
      scenarios
    });
  } catch (err) {
    console.error("Get student scenarios failed:", err);
    res.status(err.status || 500).json({
      error: err.message || "Failed to fetch scenarios"
    });
  }
};

module.exports = {
  searchScenarios,
  getAllScenarios,
  getScenarioDetail,
  generateScenario,
  modifyScenario,
  saveScenario,
  updateScenario,
  deleteScenario,
  createScenarioAssignment,
  publishScenarioAssignment,
  getScenariosForStudent
};
