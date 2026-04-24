require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const scenarioModel = require("../models/scenarioModel");
const { getAssignmentByID, updateAssignmentStatus } = require("../models/assignmentModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---- SEARCH SCENARIOS ----
const searchScenarios = async (req, res) => {
  try {
    const { subject, year_level, concepts } = req.query;

    const conceptsArr = concepts
      ? concepts.split(",").map(c => c.trim().toLowerCase())
      : null;

    const results = await scenarioModel.searchScenarios({
      subject: subject || null,
      year_level: year_level ? Number(year_level) : null,
      concepts: conceptsArr
    });

    res.json({ success: true, scenarios: results });
  } catch (err) {
    console.error("Search scenarios error:", err);
    res.status(500).json({ error: "Failed to search scenarios" });
  }
};

// ---- GET ALL SCENARIOS ----
const getAllScenarios = async (req, res) => {
  try {
    const results = await scenarioModel.getAllScenarios();
    res.json({ success: true, scenarios: results });
  } catch (err) {
    console.error("Get all scenarios error:", err);
    res.status(500).json({ error: "Failed to fetch scenarios" });
  }
};

// ---- GET SCENARIO DETAIL ----
const getScenarioDetail = async (req, res) => {
  try {
    const { scenario_id } = req.params;
    const scenario = await scenarioModel.getScenarioById(scenario_id);

    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    res.json({ success: true, scenario });
  } catch (err) {
    console.error("Get scenario error:", err);
    res.status(500).json({ error: "Failed to fetch scenario" });
  }
};

// ---- GENERATE SCENARIO VIA GEMINI ----
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
- Year Level: ${year_level || 3} (1=freshman, 4=senior)
- Difficulty: ${difficulty_level || "medium"}
- Focus Topic: ${topic || "general"}
${additional_instructions ? `- Additional Instructions: ${additional_instructions}` : ""}

RULES:
1. Create a scenario with EXACTLY this JSON structure:
{
  "context": {
    "domain": "Industry/Domain name",
    "description": "Detailed real-world scenario description (3-5 sentences)",
    "scale": "Scale metrics (e.g. users, data size, transactions)"
  },
  "problem_statement": "Clear problem the student must solve (2-3 sentences)",
  "tasks": [
    {
      "task_id": 1,
      "title": "Task Title",
      "description": "Detailed task description requiring critical thinking (2-3 sentences)",
      "marks": 5,
      "expected_concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"]
    }
  ]
}
2. Generate EXACTLY 3 tasks, each worth 5 marks
3. Each task must have 4-6 expected_concepts (lowercase keywords)
4. Make it realistic — use real company types, real numbers, real industry problems
5. Tasks should require analysis and reasoning, not just definitions
6. Output MUST be valid JSON only — no markdown, no explanations
7. JSON must start with { and end with }

Also generate a title for this scenario. Return as:
{
  "title": "Scenario Title",
  "scenario_json": { ...the scenario object above... },
  "concepts": ["all", "unique", "concepts", "across", "all", "tasks"]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();

    let generated;
    try {
      generated = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Gemini parse error:", parseErr);
      console.error("Raw response:", text);
      return res.status(500).json({ error: "AI returned invalid JSON. Please try again." });
    }

    res.json({
      success: true,
      generated: {
        title: generated.title || `${subject} Scenario`,
        scenario_json: generated.scenario_json || generated,
        concepts: generated.concepts || [],
        subject,
        year_level: year_level || 3,
        difficulty_level: difficulty_level || "medium"
      }
    });
  } catch (err) {
    console.error("Generate scenario error:", err);
    res.status(500).json({ error: "Failed to generate scenario" });
  }
};

// ---- MODIFY SCENARIO VIA GEMINI ----
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
You are an AI assistant helping a faculty member modify an academic scenario for student assignments.

CURRENT SCENARIO JSON:
${JSON.stringify(scenario_json, null, 2)}

FACULTY MODIFICATION INSTRUCTIONS:
${instructions}

RULES:
1. Modify the scenario according to the faculty's instructions
2. Keep the SAME JSON structure (context, problem_statement, tasks)
3. Each task must have: task_id, title, description, marks (always 5), expected_concepts (array of strings)
4. Ensure the scenario remains academically valid and industry-relevant
5. Output MUST be valid JSON only
6. Do NOT include markdown formatting or explanations
7. JSON must start with { and end with }

Return ONLY the modified scenario JSON object.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();

    let modified;
    try {
      modified = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Gemini response parse error:", parseErr);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }

    res.json({ success: true, modified_scenario: modified });
  } catch (err) {
    console.error("Modify scenario error:", err);
    res.status(500).json({ error: "Failed to modify scenario" });
  }
};

// ---- SAVE SCENARIO (new or modified) ----
const saveScenario = async (req, res) => {
  try {
    const { title, subject, concepts, year_level, difficulty_level, scenario_json } = req.body;
    const facname = req.faculty.facname;

    const newScenario = await scenarioModel.createScenario({
      title,
      subject,
      concepts,
      year_level,
      difficulty_level,
      scenario_json,
      created_by: facname
    });

    res.json({ success: true, scenario: newScenario });
  } catch (err) {
    console.error("Save scenario error:", err);
    res.status(500).json({ error: "Failed to save scenario" });
  }
};

// ---- UPDATE EXISTING SCENARIO ----
const updateScenario = async (req, res) => {
  try {
    const { scenario_id } = req.params;
    const { title, subject, concepts, year_level, difficulty_level, scenario_json } = req.body;

    const updated = await scenarioModel.updateScenario(scenario_id, {
      title, subject, concepts, year_level, difficulty_level, scenario_json
    });

    if (!updated) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    res.json({ success: true, scenario: updated });
  } catch (err) {
    console.error("Update scenario error:", err);
    res.status(500).json({ error: "Failed to update scenario" });
  }
};

// ---- DELETE SCENARIO ----
const deleteScenario = async (req, res) => {
  try {
    const { scenario_id } = req.params;
    const deleted = await scenarioModel.deleteScenario(scenario_id);

    if (!deleted) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    res.json({ success: true, deleted: deleted.scenario_id });
  } catch (err) {
    console.error("Delete scenario error:", err);
    res.status(500).json({ error: "Failed to delete scenario" });
  }
};

// ---- CREATE SCENARIO-BASED ASSIGNMENT ----
const createScenarioAssignment = async (req, res) => {
  try {
    const facid = req.faculty.facid;

    const {
      subject, department, division, batch, year,
      duration_minutes, deadline, difficulty_level, scenario_ids
    } = req.body;

    if (!scenario_ids || scenario_ids.length === 0) {
      return res.status(400).json({
        error: "At least one scenario must be selected"
      });
    }

    const assignment = await scenarioModel.createScenarioAssignment({
      facid, subject, department, division, batch, year,
      duration_minutes, deadline, difficulty_level, scenario_ids
    });

    res.json({ success: true, assignment });
  } catch (err) {
    console.error("Create scenario assignment error:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
};

// ---- PUBLISH SCENARIO ASSIGNMENT ----
const publishScenarioAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.body;
    const facid = req.faculty.facid;

    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.facid != facid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (assignment.assignment_type !== "scenario") {
      return res.status(400).json({ error: "Not a scenario assignment" });
    }

    if (!assignment.scenario_ids || assignment.scenario_ids.length === 0) {
      return res.status(400).json({ error: "No scenarios attached" });
    }

    if (assignment.status !== "draft") {
      return res.status(400).json({
        error: `Assignment already ${assignment.status}`
      });
    }

    const published = await updateAssignmentStatus(assignment_id, "published");
    res.json({ success: true, assignment: published });
  } catch (err) {
    console.error("Publish scenario assignment error:", err);
    res.status(500).json({ error: "Failed to publish assignment" });
  }
};

// ---- GET SCENARIOS FOR STUDENT (by assignment_id) ----
const getScenariosForStudent = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await getAssignmentByID(assignment_id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.assignment_type !== "scenario") {
      return res.status(400).json({ error: "Not a scenario assignment" });
    }

    const scenarios = await scenarioModel.getScenariosByIds(assignment.scenario_ids);

    res.json({
      success: true,
      assignment: {
        assignment_id: assignment.assignment_id,
        subject: assignment.subject,
        duration_minutes: assignment.duration_minutes,
        deadline: assignment.deadline
      },
      scenarios
    });
  } catch (err) {
    console.error("Get scenarios for student error:", err);
    res.status(500).json({ error: "Failed to fetch scenarios" });
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
