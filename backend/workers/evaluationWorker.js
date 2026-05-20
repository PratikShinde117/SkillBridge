const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const { Worker } = require("bullmq");
const axios = require("axios");

const db = require("../db");
const connection = require("../redisConnection");

const EVALUATION_BASE_URL =
  process.env.EVALUATION_SERVICE_URL;

const worker = new Worker(
  "evaluationQueue",

  async (job) => {

    const {
      submission_id,
      assignment_id,
      roll_no,
      assignment_type,
      answers,
      scenario_ids
    } = job.data;

    try {

      console.log("Processing:", submission_id);

      await db.query(
        `UPDATE assignment_submissions
         SET evaluation_status = 'processing'
         WHERE submission_id = $1`,
        [submission_id]
      );

      let evaluationResponse;

      // 🔹 Scenario evaluation
      if (assignment_type === "scenario") {

        const scenarios = (scenario_ids || []).map((scenario_id) => {
          return {
            scenario_id: Number(scenario_id),
            answers: Object.entries(answers)
              .filter(([key]) =>
                key.startsWith(`${scenario_id}_`)
              )
              .map(([key, value]) => ({
                task_id: Number(key.split("_")[1]),
                answer: value || ""
              }))
          };
        });

        evaluationResponse = await axios.post(
          `${EVALUATION_BASE_URL}/evaluate-scenario`,
          {
            assignment_id: Number(assignment_id),
            student_id: roll_no,
            scenarios
          }
        );

      } else {

        // 🔹 Question evaluation
        const student_answers = {};

        Object.entries(answers).forEach(([key, value]) => {
          student_answers[String(key)] = value ?? "";
        });

        evaluationResponse = await axios.post(
          `${EVALUATION_BASE_URL}/evaluate-question`,
          {
            assignment_id: Number(assignment_id),
            student_id: roll_no,
            student_answers
          }
        );
      }

      // 🔹 Save result
      await db.query(
        `UPDATE assignment_submissions
         SET evaluation_result = $1,
             total_score = $2,
             evaluation_status = 'completed'
         WHERE submission_id = $3`,
        [
          JSON.stringify(
            evaluationResponse.data.evaluation_result
          ),
          Math.round(
            evaluationResponse.data.evaluation_result?.total_score || 0
          ),
          submission_id
        ]
      );

      console.log("Completed:", submission_id);

    } catch (err) {

      console.error("Evaluation failed:", err.message);

      await db.query(
        `UPDATE assignment_submissions
         SET evaluation_status = 'failed'
         WHERE submission_id = $1`,
        [submission_id]
      );
    }
  },

  { connection }
);