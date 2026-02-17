// require("dotenv").config();
// const express = require("express");
// const app = express();
// const cors = require("cors");
// import modelRoutes from "./routes/modelRoutes.js"
// const multer = require("multer");
// const bodyParser = require("body-parser");
// const buffer = require("fs");
// const PdfParse = require("pdf-parse");

// const pool = require("./db");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const apiKey = process.env.GEMINI_API_KEY;


// console.log("Loaded API Key:", process.env.GEMINI_API_KEY);
// const genAI = new GoogleGenerativeAI(apiKey);

// const upload = multer({ dest: "uploads/" });
// app.use(bodyParser.json());
// app.use(cors());

// app.use("/api/models", modelRoutes);




// app.post("/uploadresume", upload.single("file"), async (req, res) => {
//     try {
//         const file = req.file;
//         const { name, email, roll_no, division, batch } = req.body;

//         const databuffer = buffer.readFileSync(file.path);
//         const parsred = await PdfParse(databuffer);

//         const resumeText = parsred.text;

//         const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)/;
//         const match = resumeText.match(githubRegex);
//         const githubUsername = match ? match[1] : null;

//         if (!githubUsername) {
//             return res.status(400).json({ error: "No GitHub username found in resume" });
//         }


//         await pool.query(
//             'INSERT INTO Div_A(roll_no, name, email, division, batch, resume_file, rediness_score, resume_text) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
//             [roll_no, name, email, division, batch, file, 0, resumeText]
//         );



//         const profile = await fetch(`https://api.github.com/users/${githubUsername}`)
//             .then(response => response.json());

//         const repos = await fetch(`https://api.github.com/users/${githubUsername}/repos`)
//             .then(response => response.json());

//         const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);


//         const totalRepos = repos.length;
//         const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
//         const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
//         const github_url = profile.html_url;


//         await pool.query('insert into github_stats(roll_no, github_username, division, batch, repos, github_url, stars, languages) values($1,$2,$3,$4,$5,$6,$7,$8)',
//             [roll_no, githubUsername, division, batch, repos, github_url, stars, languages]
//         );



//         res.json({
//             message: "Resume uploaded successfully",
//             github: {
//                 user: githubUsername,
//                 profile,
//                 repos,
//                 totalRepos,
//                 totalForks,
//                 stars,
//                 languages,

//             },



//         });


//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "GitHub fetch failed" });
//     }

// });

// app.post("/skillanalysis/:roll_no", async (req, res) => {
//     try {

//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


//         const { roll_no } = req.params;

//         const queryResult = await pool.query("SELECT resume_text FROM div_a WHERE roll_no = $1", [roll_no]);


//         const resumeText = queryResult.rows[0]?.resume_text;

//         if (!resumeText) {
//             return res.status(404).json({ error: `Resume not found for roll number: ${roll_no}` });
//         }

//         const prompt = `You are an expert AI career and skill analyst specializing in analyzing student resumes for career development and employability.

// Your task is to read the provided resume text carefully and produce a structured JSON analysis focused on the following areas.

// Make the analysis personalized — not generic — based strictly on what the resume indicates about the student's skills, projects, and career objective.

// Specifically:
// - Identify the student's **goal or career direction** from the resume.
// - Extract **core technical skills** and **soft skills** explicitly or implicitly mentioned.
// - Assess **strengths** and **weaknesses** based on experience and project depth.
// - For **industry_needs**, do NOT list generic trends.
//   - Instead, analyze the student’s goal and existing skills, then identify the *most relevant and high-demand skills, tools, or domains* that are currently valued in the market **for that exact profile**.
//   - Example: If the resume shows Python + Data Analytics, industry needs might include “Data Engineering, Model Deployment (MLOps), Generative AI for Analytics,” etc.
//   - Example: If the resume shows Java + Web Dev, industry needs might include “Spring Boot Microservices, Cloud-Native APIs, CI/CD Pipelines,” etc.
// - Include specific **suggestions** for upskilling (courses, frameworks, certifications, or project ideas).
// - Assign a **readiness score** out of 10 based on employability.

// Input:
// - Resume Text: ${resumeText}

// Output (in valid JSON only, no extra explanation):
// {
//   "goal": "Career goal inferred from resume (example: Full Stack Developer, Data Analyst, AI Engineer, etc.)",
//   "core_skills": ["Extracted core technical skills"],
//   "soft_skills": ["Extracted soft or interpersonal skills"],
//   "strengths": ["Strong areas or achievements"],
//   "weaknesses": ["Skill gaps or missing areas"],
//   "industry_needs": ["Market-demanded skills and technologies aligned with this student's goal and skillset (not general)"],
//   "suggestions": {
//     "core_skill_improvement": ["Technologies or topics to learn next"],
//     "soft_skill_improvement": ["Communication, teamwork, etc."],
//     "project_suggestions": ["2–3 project ideas closely related to goal and industry trends"]
//   },
//   "readiness_score": "Overall readiness score out of 10"
// }

//         `;


//         const result = await model.generateContent(prompt);
//         const responseText = await result.response.text();


//         const cleanJson = responseText
//             .replace(/```json/g, '')
//             .replace(/```/g, '')
//             .trim();


//         let analysis;
//         try {
//             analysis = JSON.parse(cleanJson);
//         } catch (e) {
//             console.error("Failed to parse Gemini response as JSON:", e);
//             return res.status(500).json({ error: "Invalid JSON format from Gemini", raw: responseText });
//         }



//         await pool.query(
//       `INSERT INTO skill_analysis (
//         roll_no, goal, core_skills, soft_skills, strengths, weaknesses,
//         industry_needs, core_skill_improvement, soft_skill_improvement,
//         project_suggestions, readiness_score
//       )
//       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
//       ON CONFLICT (roll_no) DO UPDATE SET
//         goal = EXCLUDED.goal,
//         core_skills = EXCLUDED.core_skills,
//         soft_skills = EXCLUDED.soft_skills,
//         strengths = EXCLUDED.strengths,
//         weaknesses = EXCLUDED.weaknesses,
//         industry_needs = EXCLUDED.industry_needs,
//         core_skill_improvement = EXCLUDED.core_skill_improvement,
//         soft_skill_improvement = EXCLUDED.soft_skill_improvement,
//         project_suggestions = EXCLUDED.project_suggestions,
//         readiness_score = EXCLUDED.readiness_score;`,
//       [
//         roll_no,
//         analysis.goal,
//         analysis.core_skills,
//         analysis.soft_skills,
//         analysis.strengths,
//         analysis.weaknesses,
//         analysis.industry_needs,
//         analysis.suggestions?.core_skill_improvement,
//         analysis.suggestions?.soft_skill_improvement,
//         analysis.suggestions?.project_suggestions,
//         analysis.readiness_score,
//       ]
//     );

//         res.json({
//             success: true,
//             analysis: analysis
//         });

//     } catch (err) {
//         console.error("Error in /skillanalysis:", err.message);
//         res.status(500).json({ error: "Server error during skill analysis." });
//     }
// });



// app.listen(5000, () => {
//     console.log("Listening on port 5000");
// });

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const modelRoutes = require("./routes/modelRoutes"); 


const app = express();
app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true,               
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(bodyParser.json());

app.use(express.json());
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("", modelRoutes);

app.listen(5000, () => {
  console.log("Listening on port 5000");
});
