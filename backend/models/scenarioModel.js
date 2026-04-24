const db = require("../db");

// Search scenarios — matches if ANY concept overlaps (single match included)
// Also supports partial ILIKE subject matching
const searchScenarios = async ({ subject, year_level, concepts }) => {
  let query = `SELECT scenario_id, title, subject, concepts, year_level, difficulty_level, created_by, created_at
     FROM scenarios WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (subject) {
    query += ` AND LOWER(subject) LIKE LOWER($${idx})`;
    params.push(`%${subject}%`);
    idx++;
  }

  if (year_level) {
    query += ` AND year_level = $${idx}`;
    params.push(year_level);
    idx++;
  }

  if (concepts && concepts.length > 0) {
    // ?| matches if ANY element in the array overlaps
    query += ` AND concepts ?| $${idx}`;
    params.push(concepts);
    idx++;
  }

  query += ` ORDER BY updated_at DESC`;

  const result = await db.query(query, params);
  return result.rows;
};

// Get all scenarios (for library browsing)
const getAllScenarios = async () => {
  const result = await db.query(
    `SELECT scenario_id, title, subject, concepts, year_level, difficulty_level, created_by, created_at
     FROM scenarios ORDER BY created_at DESC`
  );
  return result.rows;
};

// Get single scenario by ID (full detail)
const getScenarioById = async (id) => {
  const result = await db.query(
    `SELECT * FROM scenarios WHERE scenario_id = $1`,
    [id]
  );
  return result.rows[0];
};

// Get multiple scenarios by ID array
const getScenariosByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];
  const result = await db.query(
    `SELECT * FROM scenarios WHERE scenario_id = ANY($1) ORDER BY scenario_id`,
    [ids]
  );
  return result.rows;
};

// Create new scenario
const createScenario = async (data) => {
  const {
    title, subject, concepts, year_level,
    difficulty_level, scenario_json, created_by
  } = data;

  const result = await db.query(
    `INSERT INTO scenarios
     (title, subject, concepts, year_level, difficulty_level, scenario_json, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      title,
      subject,
      JSON.stringify(concepts),
      year_level,
      difficulty_level || "medium",
      JSON.stringify(scenario_json),
      created_by
    ]
  );

  return result.rows[0];
};

// Update scenario
const updateScenario = async (scenario_id, data) => {
  const { title, subject, concepts, year_level, difficulty_level, scenario_json } = data;

  const result = await db.query(
    `UPDATE scenarios
     SET title=$1, subject=$2, concepts=$3, year_level=$4,
         difficulty_level=$5, scenario_json=$6, updated_at=NOW()
     WHERE scenario_id=$7
     RETURNING *`,
    [
      title, subject,
      JSON.stringify(concepts),
      year_level,
      difficulty_level || "medium",
      JSON.stringify(scenario_json),
      scenario_id
    ]
  );

  return result.rows[0];
};

// Delete scenario
const deleteScenario = async (scenario_id) => {
  const result = await db.query(
    `DELETE FROM scenarios WHERE scenario_id=$1 RETURNING scenario_id`,
    [scenario_id]
  );
  return result.rows[0];
};

// Create scenario-based assignment
const createScenarioAssignment = async ({
  facid, subject, department, division, batch, year,
  duration_minutes, deadline, difficulty_level, scenario_ids
}) => {
  const result = await db.query(
    `INSERT INTO assignments
     (facid, subject, department, division, batch, year,
      duration_minutes, deadline, difficulty_level,
      scenario_ids, assignment_type, status,
      total_questions, mcq_count, descriptive_count, ai_generated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'scenario','draft',0,0,0,false)
     RETURNING *`,
    [
      facid, subject, department, division, batch, year,
      duration_minutes, deadline, difficulty_level || "medium",
      JSON.stringify(scenario_ids)
    ]
  );

  return result.rows[0];
};

module.exports = {
  searchScenarios,
  getAllScenarios,
  getScenarioById,
  getScenariosByIds,
  createScenario,
  updateScenario,
  deleteScenario,
  createScenarioAssignment
};
