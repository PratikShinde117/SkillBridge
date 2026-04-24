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

const mapScenarioRow = (row) => ({
  ...row,
  concepts: normalizeJson(row.concepts, []),
  scenario_json: normalizeJson(row.scenario_json, row.scenario_json)
});

const searchScenarios = async ({ subject, year_level, concepts, created_by }) => {
  let query = `SELECT scenario_id, title, subject, concepts, year_level, difficulty_level, created_by, created_at, scenario_json
     FROM scenarios
     WHERE created_by = $1`;
  const params = [created_by];
  let idx = 2;

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
    query += ` AND concepts ?| $${idx}`;
    params.push(concepts);
    idx++;
  }

  query += ` ORDER BY updated_at DESC`;

  const result = await db.query(query, params);
  return result.rows.map(mapScenarioRow);
};

const getAllScenarios = async (created_by) => {
  const result = await db.query(
    `SELECT scenario_id, title, subject, concepts, year_level, difficulty_level, created_by, created_at, scenario_json
     FROM scenarios
     WHERE created_by = $1
     ORDER BY created_at DESC`,
    [created_by]
  );
  return result.rows.map(mapScenarioRow);
};

const getScenarioById = async (scenario_id, created_by = null) => {
  const query = created_by
    ? `SELECT * FROM scenarios WHERE scenario_id = $1 AND created_by = $2`
    : `SELECT * FROM scenarios WHERE scenario_id = $1`;
  const params = created_by ? [scenario_id, created_by] : [scenario_id];
  const result = await db.query(query, params);
  return result.rows[0] ? mapScenarioRow(result.rows[0]) : null;
};

const getScenariosByIds = async (ids, created_by = null) => {
  if (!ids || ids.length === 0) return [];

  const query = created_by
    ? `SELECT * FROM scenarios WHERE scenario_id = ANY($1) AND created_by = $2 ORDER BY scenario_id`
    : `SELECT * FROM scenarios WHERE scenario_id = ANY($1) ORDER BY scenario_id`;
  const params = created_by ? [ids, created_by] : [ids];
  const result = await db.query(query, params);
  return result.rows.map(mapScenarioRow);
};

const createScenario = async ({
  title,
  subject,
  concepts,
  year_level,
  difficulty_level,
  scenario_json,
  created_by
}) => {
  const result = await db.query(
    `INSERT INTO scenarios
     (title, subject, concepts, year_level, difficulty_level, scenario_json, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      title,
      subject,
      JSON.stringify(concepts || []),
      year_level,
      difficulty_level || "medium",
      JSON.stringify(scenario_json),
      created_by
    ]
  );

  return mapScenarioRow(result.rows[0]);
};

const updateScenario = async (scenario_id, data, created_by) => {
  const { title, subject, concepts, year_level, difficulty_level, scenario_json } = data;

  const result = await db.query(
    `UPDATE scenarios
     SET title = $1,
         subject = $2,
         concepts = $3,
         year_level = $4,
         difficulty_level = $5,
         scenario_json = $6,
         updated_at = NOW()
     WHERE scenario_id = $7 AND created_by = $8
     RETURNING *`,
    [
      title,
      subject,
      JSON.stringify(concepts || []),
      year_level,
      difficulty_level || "medium",
      JSON.stringify(scenario_json),
      scenario_id,
      created_by
    ]
  );

  return result.rows[0] ? mapScenarioRow(result.rows[0]) : null;
};

const deleteScenario = async (scenario_id, created_by) => {
  const result = await db.query(
    `DELETE FROM scenarios
     WHERE scenario_id = $1 AND created_by = $2
     RETURNING scenario_id`,
    [scenario_id, created_by]
  );

  return result.rows[0] || null;
};

const createScenarioAssignment = async ({
  facid,
  subject,
  department,
  division,
  batch,
  year,
  duration_minutes,
  deadline,
  difficulty_level,
  scenario_ids
}) => {
  const result = await db.query(
    `INSERT INTO assignments
     (facid, subject, syllabus_description, department, division, batch, year,
      duration_minutes, deadline, difficulty_level,
      scenario_ids, assignment_type, status,
      total_questions, mcq_count, descriptive_count, ai_generated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'scenario','draft',0,0,0,false)
     RETURNING *`,
    [
      facid,
      subject,
      "Scenario-based assignment",
      department,
      division,
      batch,
      year,
      duration_minutes,
      deadline,
      difficulty_level || "medium",
      JSON.stringify(scenario_ids || [])
    ]
  );

  return {
    ...result.rows[0],
    assignment_type: "scenario",
    scenario_ids: normalizeJson(result.rows[0].scenario_ids, [])
  };
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
