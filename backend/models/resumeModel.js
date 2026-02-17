const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const PdfParse = require("pdf-parse");
const cors = require("cors");

// console.log(newStud);

const pool = require("../db");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { error } = require("console");
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;



const genAI = new GoogleGenerativeAI(apiKey);
const upload = multer({ dest: "uploads/" });

// If this is inside a standalone file, add an Express `app` only if needed
// app.use(bodyParser.json());
// app.use(cors());

const uploadResume = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No resume file uploaded" });
    }
    const file = req.file;
    const { studname, studemail, roll_no, studdiv} = req.user;
    
    console.log({ studname, studemail, roll_no, studdiv});

    const databuffer = fs.readFileSync(file.path);
    const parsed = await PdfParse(databuffer);
    const resumeText = parsed.text;
console.log(resumeText);
    const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)/;
    const match = resumeText.match(githubRegex);
    const githubUsername = match ? match[1] : null;
    const today = new Date().toISOString().split("T")[0];
    if (!githubUsername) {
      return res
        .status(400)
        .json({ error: "No GitHub username found in resume" });
    }

    const a = await pool.query(
      "SELECT * FROM resume_data WHERE roll_no = $1 AND analysis_date = $2",
      [roll_no, today]
    );

    if (a.rows.length > 0) {
      return res.status(400).json({
        error: `You have already analysed your resume on ${today}. Please try tomorrow.`
      });
    }

    await pool.query(
      "INSERT INTO resume_data(roll_no, analysis_date, resume_file, resume_text) VALUES ($1,$2,$3,$4)",
      [roll_no, today, file, resumeText]
    );

    const profile = await fetch(`https://api.github.com/users/${githubUsername}`)
      .then((response) => response.json());

    const repos = await fetch(`https://api.github.com/users/${githubUsername}/repos`)
      .then((response) => response.json());

    const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
    const totalRepos = repos.length;
    const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    const languages = [...new Set(repos.map((r) => r.language).filter(Boolean))];
    const github_url = profile.html_url;

 
    await pool.query(
      `INSERT INTO github_stats (
     roll_no, analysis_date, github_username, repos, github_url, stars, languages
   )
   VALUES ($1, $2, $3, $4, $5, $6, $7)
   ON CONFLICT (roll_no, analysis_date)
   DO UPDATE SET
     github_username = EXCLUDED.github_username,
     repos = EXCLUDED.repos,
     github_url = EXCLUDED.github_url,
     stars = EXCLUDED.stars,
     languages = EXCLUDED.languages;`,
      [
        roll_no,
        today,
        githubUsername,
        JSON.stringify(repos),
        github_url,
        stars,
        JSON.stringify(languages),
      ]
    );

    res.json({
      message: "Resume uploaded successfully",
      github: {
        user: githubUsername,
        profile,
        repos,
        totalRepos,
        totalForks,
        stars,
        languages,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "GitHub fetch failed" });
  }
};





const skillAnalysis = async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const  roll_no  = req.user.roll_no;
    console.log(roll_no);
     const today = new Date().toISOString().split("T")[0];

     const existingAnalysis = await pool.query(
  "SELECT * FROM skill_analysis WHERE roll_no = $1 AND analysis_date = $2",
  [roll_no, today]
);

if (existingAnalysis.rows.length > 0) {
  return res.status(400).json({
    error: `You have already performed resume analysis today (${today}). Please try tomorrow.`
  });
}

    const resumeResult = await pool.query(
  "SELECT resume_text FROM resume_data WHERE roll_no = $1 AND analysis_date = $2",
  [roll_no, today]
);

const resumeText = resumeResult.rows[0]?.resume_text;

if (!resumeText) {
  return res.status(404).json({ error: `Resume not found for roll number: ${roll_no} today` });
}


  

    const prompt = `
    IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT include trailing commas
- Do NOT include markdown, bullet points, or explanations
- All strings must be properly escaped
- Arrays must contain only strings
- readiness_score must be a NUMBER (not text)

    You are an expert AI career and skill analyst specializing in analyzing student resumes for career development and employability.

Your task is to read the provided resume text carefully and produce a structured JSON analysis focused on the following areas.

Make the analysis personalized — not generic — based strictly on what the resume indicates about the student's skills, projects, and career objective.

Specifically:
- Identify the student's **goal or career direction** from the resume.
- Extract **core technical skills** and **soft skills** explicitly or implicitly mentioned.
- Assess **strengths** and **weaknesses** based on experience and project depth.
- For **industry_needs**, do NOT list generic trends.
  - Instead, analyze the student’s goal and existing skills, then identify the *most relevant and high-demand skills, tools, or domains* that are currently valued in the market **for that exact profile**.
  - Example: If the resume shows Python + Data Analytics, industry needs might include “Data Engineering, Model Deployment (MLOps), Generative AI for Analytics,” etc.
  - Example: If the resume shows Java + Web Dev, industry needs might include “Spring Boot Microservices, Cloud-Native APIs, CI/CD Pipelines,” etc.
- Include specific **suggestions** for upskilling (courses, frameworks, certifications, or project ideas).
- Assign a **readiness score** out of 10 based on employability.

Input:
- Resume Text: ${resumeText}

Output (in valid JSON only, no extra explanation):
{
  "goal": "Career goal inferred from resume (example: Full Stack Developer, Data Analyst, AI Engineer, etc.)",
  "core_skills": ["Extracted core technical skills"],
  "soft_skills": ["Extracted soft or interpersonal skills"],
  "strengths": ["Strong areas or achievements"],
  "weaknesses": ["Skill gaps or missing areas"],
  "industry_needs": ["Market-demanded skills and technologies aligned with this student's goal and skillset (not general)"],
  "suggestions": {
    "core_skill_improvement": ["Technologies or topics to learn next"],
    "soft_skill_improvement": ["Communication, teamwork, etc."],
    "project_suggestions": ["2–3 project ideas closely related to goal and industry trends"]
  },
  "readiness_score": "Overall readiness score out of 10"
}`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    const cleanJson = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e);
      return res.status(500).json({
        error: "Invalid JSON format from Gemini",
        raw: responseText,
      });
    }

    await pool.query(
      `INSERT INTO skill_analysis (
    roll_no, analysis_date, goal, core_skills, soft_skills, strengths, weaknesses,
    industry_needs, core_skill_improvement, soft_skill_improvement,
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
    readiness_score = EXCLUDED.readiness_score;`,
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
        analysis.readiness_score,
      ]
    );

    console.log(analysis.readiness_score);

    res.json({
      success: true,
      analysis: analysis,
    });
  } catch (err) {
    console.error("Error in /skillanalysis:", err.message);
    res.status(500).json({ error: "Server error during skill analysis." });
  }
};

module.exports = {
  uploadResume,
  skillAnalysis,
};

