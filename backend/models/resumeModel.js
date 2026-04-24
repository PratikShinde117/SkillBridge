
const multer = require("multer");
const fs = require("fs");
const PdfParse = require("pdf-parse");
const pool = require("../db");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const {jsonrepair} = require("jsonrepair");
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const upload = multer({ dest: "uploads/" });

/* ===================================
   RESUME UPLOAD
=================================== */

const uploadResume = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        error: "No resume file uploaded"
      });
    }

    const file = req.file;

    const { studname, studemail, roll_no, studdiv } = req.user;

    console.log({ studname, studemail, roll_no, studdiv });

    const databuffer = fs.readFileSync(file.path);

    const parsed = await PdfParse(databuffer);

    const resumeText = parsed.text;

    console.log(resumeText);

    const today = new Date().toISOString().split("T")[0];

    const existing = await pool.query(
      "SELECT * FROM resume_data WHERE roll_no=$1 AND analysis_date=$2",
      [roll_no, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: `You have already analysed your resume on ${today}. Please try tomorrow.`
      });
    }

    await pool.query(
      `INSERT INTO resume_data
       (roll_no, analysis_date, resume_file, resume_text)
       VALUES ($1,$2,$3,$4)`,
      [roll_no, today, file.filename, resumeText]
    );

    res.json({
      message: "Resume uploaded successfully"
    });

  } catch (err) {

    console.error("Resume upload error:", err);

    res.status(500).json({
      error: "Resume upload failed"
    });

  }
};


/* ===================================
   SKILL ANALYSIS
=================================== */

const skillAnalysis = async (req, res) => {
  try {

    const roll_no = req.user.roll_no;

    const today = new Date().toISOString().split("T")[0];

    const existingAnalysis = await pool.query(
      "SELECT * FROM skill_analysis WHERE roll_no=$1 AND analysis_date=$2",
      [roll_no, today]
    );

    if (existingAnalysis.rows.length > 0) {
      return res.status(400).json({
        error: `You have already performed resume analysis today (${today}). Please try tomorrow.`
      });
    }

    const resumeResult = await pool.query(
      "SELECT resume_text FROM resume_data WHERE roll_no=$1 AND analysis_date=$2",
      [roll_no, today]
    );

    const resumeText = resumeResult.rows[0]?.resume_text;

    if (!resumeText) {
      return res.status(404).json({
        error: `Resume not found for roll number: ${roll_no}`
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `
IMPORTANT RULES
- Return ONLY valid JSON
- Do NOT include explanations
- Do NOT include markdown
- readiness_score must be a NUMBER

You are an expert AI career analyst for engineering students.

Analyze the following resume and produce a structured skill analysis.

Focus on:

1. Career goal inferred from resume
2. Core technical skills
3. Soft skills
4. Strengths
5. Weaknesses
6. Industry-demanded skills relevant to the student's profile
7. Suggestions for improvement
8. Employability readiness score

Resume Text:
${resumeText}

Return JSON in this format:

{
  "goal": "",
  "core_skills": [],
  "soft_skills": [],
  "strengths": [],
  "weaknesses": [],
  "industry_needs": [],
  "suggestions": {
    "core_skill_improvement": [],
    "soft_skill_improvement": [],
    "project_suggestions": []
  },
  "readiness_score": 0
}

upadate this such that instead of just telling what your resume contains it should analyse such that it actually adds some value to understanding of student
`;

    const result = await model.generateContent(prompt);

    const responseText = await result.response.text();

    let analysis;

    // try {

    //   let cleaned = responseText
    //     .replace(/```json/g, "")
    //     .replace(/```/g, "")
    //     .trim();

    //   const start = cleaned.indexOf("{");
    //   const end = cleaned.lastIndexOf("}");

    //   if (start === -1 || end === -1) {
    //     throw new Error("No JSON found in Gemini response");
    //   }

    //   const jsonString = cleaned.substring(start, end + 1);

    //   analysis = JSON.parse(jsonString);

    // } catch (err) {

    //   console.error("Failed to parse Gemini JSON:", err);
    //   console.log("RAW GEMINI RESPONSE:", responseText);

    //   return res.status(500).json({
    //     error: "Invalid JSON from Gemini",
    //     raw: responseText
    //   });

    // }

    try {

  let cleaned = responseText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON found in Gemini response");
  }

  let jsonString = cleaned.substring(start, end + 1);

  // 🔥 FIX: repair broken JSON
  try {
    jsonString = jsonrepair(jsonString);
  } catch (repairErr) {
    console.warn("JSON repair failed, trying raw parse...");
  }

  analysis = JSON.parse(jsonString);

} catch (err) {

  console.error("Failed to parse Gemini JSON:", err);
  console.log("RAW GEMINI RESPONSE:", responseText);

  return res.status(500).json({
    error: "Invalid JSON from Gemini",
    raw: responseText
  });

}

    await pool.query(
      `INSERT INTO skill_analysis (
        roll_no, analysis_date, goal, core_skills, soft_skills,
        strengths, weaknesses, industry_needs,
        core_skill_improvement, soft_skill_improvement,
        project_suggestions, readiness_score
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (roll_no, analysis_date)
      DO UPDATE SET
        goal = EXCLUDED.goal,
        core_skills = EXCLUDED.core_skills,
        soft_skills = EXCLUDED.soft_skills,
        strengths = EXCLUDED.strengths,
        weaknesses = EXCLUDED.weaknesses,
        industry_needs = EXCLUDED.industry_needs,
        core_skill_improvement = EXCLUDED.core_skill_improvement,
        soft_skill_improvement = EXCLUDED.soft_skill_improvement,
        project_suggestions = EXCLUDED.project_suggestions,
        readiness_score = EXCLUDED.readiness_score`,
      [
        roll_no,
        today,
        analysis.goal,
        analysis.core_skills,
        analysis.soft_skills,
        analysis.strengths,
        analysis.weaknesses,
        analysis.industry_needs,
        analysis.suggestions?.core_skill_improvement,
        analysis.suggestions?.soft_skill_improvement,
        analysis.suggestions?.project_suggestions,
        analysis.readiness_score
      ]
    );

    res.json({
      success: true,
      analysis
    });

  } catch (err) {

    console.error("Skill analysis error:", err);

    res.status(500).json({
      error: "Server error during skill analysis"
    });

  }
};


module.exports = {
  uploadResume,
  skillAnalysis
};