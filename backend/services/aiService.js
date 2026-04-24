




require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const CACHE_DIR = path.join(__dirname, "../cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const generateCacheKey = (context) => {

  const raw = `
    ${context.subject}
    ${context.syllabus}
    ${context.difficulty}
    ${context.year}
    ${context.focus_topic}
    ${context.pattern.mcq}
    ${context.pattern.descriptive}
  `;

  return raw
  .replace(/\s+/g, "_")
  .replace(/[^a-zA-Z0-9_]/g, "")
  .toLowerCase()
  .slice(0, 120); // ✅ prevent Windows path issues
};

const getCachedQuestions = async context => {
  const key = generateCacheKey(context);
  const file = path.join(CACHE_DIR, key + ".json");

  if (!fs.existsSync(file)) return null;

  const data = fs.readFileSync(file, "utf8");

  return JSON.parse(data);
};

const cacheQuestions = async (context, questions) => {
  const key = generateCacheKey(context);
  const file = path.join(CACHE_DIR, key + ".json");

  fs.writeFileSync(
    file,
    JSON.stringify(questions, null, 2)
  );
};

const generateQuestions = async context => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in backend/.env");
  }

  const model =
    genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

  const prompt = `

You are an AI system assisting a Competency-Based Adaptive Learning Platform used in an engineering college.

Your task is to generate:

1. An Industry Case Study (structured format)
2. Structured assignment questions (MCQs + Descriptive)

The generated content will be used to evaluate students' conceptual understanding and real-world problem-solving ability.

--------------------------------------------------
ACADEMIC CONTEXT
--------------------------------------------------

Subject: ${context.subject}

Syllabus Scope (STRICT BOUNDARY — DO NOT EXCEED):
${context.syllabus}

Student Academic Level (Year): ${context.year}
Difficulty Level: ${context.difficulty}

--------------------------------------------------
CASE STUDY GENERATION
--------------------------------------------------

Generate a structured case study (120–180 words) in a clear bullet-point format.

The case study must:

• Describe a realistic industry scenario (avoid fictional or overly abstract problems)
• Reflect actual engineering use-cases and constraints
• Clearly show how the system/problem exists in the real world
• Be written in simple and understandable English (based on student year)
• Introduce relevant technical elements indirectly from the syllabus
• Encourage students to think about how systems work and why decisions matter

Structure format:

- Problem Context
- System Description
- Technical Challenge
- Expected Outcome / Goal

Restrictions:

• DO NOT include formulas, definitions, or direct answers
• DO NOT mention questions
• DO NOT introduce topics outside the syllabus
• DO NOT make it overly futuristic or AI-focused unless syllabus allows

--------------------------------------------------
STUDENT LEVEL ADAPTATION (VERY IMPORTANT)
--------------------------------------------------

Strictly align difficulty and concepts:

Year 1:
• Basic programming, memory basics, simple logic
• Use very simple language
• Avoid complex systems

Year 2:
• Small systems, modular thinking, basic OS/DB concepts

Year 3:
• Algorithms, system behavior, design-level reasoning

Year 4:
• Industry-scale systems, performance, trade-offs, scalability

If content exceeds student capability → it is INVALID.

--------------------------------------------------
QUESTION DISTRIBUTION
--------------------------------------------------

MCQ Questions: ${context.pattern.mcq}
Descriptive Questions: ${context.pattern.descriptive}

--------------------------------------------------
MCQ DESIGN RULES
--------------------------------------------------

Each MCQ must:

• Be based on case study + syllabus concept application
• Test understanding, not memorization
• Contain exactly 4 options
• Have only ONE correct answer
• Include realistic distractors (common mistakes)

Avoid:

• Direct definition questions
• Trivial or theoretical-only questions

Each MCQ must include:

- question_text
- options
- correct_answer
- difficulty
- skill_tag

--------------------------------------------------
DESCRIPTIVE QUESTION DESIGN RULES
--------------------------------------------------

Descriptive questions must:

• Be application-oriented and scenario-based
• Require reasoning, explanation, or system thinking
• Focus on how and why, not just what
• Help improve technical depth and problem-solving skills
• Be aligned with real-world engineering thinking

Avoid:

• Definition-only or theory-dumping questions

Each question must include:

- question_text
- expected_points (4–6 points)

--------------------------------------------------
RUBRIC GENERATION RULES
--------------------------------------------------

Each descriptive question must include 4–6 evaluation points.

Each point must:

• Represent a distinct technical idea
• Be independently gradable
• Be concise and meaningful
• Reflect actual understanding or reasoning

--------------------------------------------------
INDUSTRY ALIGNMENT
--------------------------------------------------

Use realistic contexts such as:

• cloud systems
• operating systems
• databases
• web/mobile applications
• embedded systems

But:

• Stay strictly within syllabus
• Do NOT introduce advanced topics beyond student level

--------------------------------------------------
STRICT OUTPUT REQUIREMENTS
--------------------------------------------------

1. Output MUST be valid JSON
2. Do NOT include explanations
3. Do NOT include markdown
4. JSON must start with { and end with }
5. Do NOT include trailing commas

--------------------------------------------------
OUTPUT JSON STRUCTURE
--------------------------------------------------

{
  "case_study": "",

  "mcqs": [
    {
      "question_text": "",
      "options": ["", "", "", ""],
      "correct_answer": "",
      "difficulty": "${context.difficulty}",
      "skill_tag": ""
    }
  ],

  "descriptive": [
    {
      "question_text": "",
      "expected_points": [
        "",
        "",
        "",
        ""
      ],
      "difficulty": "${context.difficulty}",
      "skill_tag": ""
    }
  ]
}

Ensure:
• MCQs count = ${context.pattern.mcq}
• Descriptive count = ${context.pattern.descriptive}

Return ONLY the JSON object.

`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text
      .replace(/```json|```/g, "")
      .trim();

    console.log("RAW AI RESPONSE:\n", cleaned);
    return JSON.parse(cleaned);
  } catch (error) {
    const message = String(error?.message || "");

    if (message.includes("fetch failed")) {
      throw new Error(
        "Gemini request failed. Check internet access, firewall/proxy settings, and whether the API key is valid and enabled."
      );
    }

    if (message.toLowerCase().includes("api key")) {
      throw new Error("Gemini API key was rejected. Verify GEMINI_API_KEY in backend/.env.");
    }

    throw error;
  }
};

module.exports = {
  generateQuestions,
  getCachedQuestions,
  cacheQuestions
};





// You are an AI system assisting a Competency-Based Adaptive Learning Platform
// used in an engineering college.

// Your task is to generate structured assignment questions that help evaluate
// student competencies relevant to real-world engineering practice.

// The generated content will be used for automated evaluation and skill-gap analysis,
// therefore strict structure and clarity are required.

// --------------------------------------------------
// ACADEMIC CONTEXT
// --------------------------------------------------

// Subject: ${context.subject}

// Syllabus Scope (STRICT BOUNDARY — DO NOT EXCEED):
// ${context.syllabus}

// Student Academic Level (Year): ${context.year}

// Difficulty Level: ${context.difficulty}

// --------------------------------------------------
// STUDENT LEVEL GUIDELINES
// --------------------------------------------------

// Adapt question complexity based on the student year.

// Year 1:
// Focus on conceptual understanding and simple applications.

// Year 2:
// Focus on applying concepts to small technical problems.

// Year 3:
// Include system reasoning, algorithmic thinking, and architectural considerations.

// Year 4:
// Include real-world engineering scenarios, performance constraints,
// trade-off analysis, and design reasoning.

// --------------------------------------------------
// QUESTION DISTRIBUTION
// --------------------------------------------------

// MCQ Questions: ${context.pattern.mcq}

// Descriptive Questions: ${context.pattern.descriptive}

// --------------------------------------------------
// MCQ DESIGN RULES
// --------------------------------------------------

// 1. Each MCQ must test conceptual application rather than rote memorization.
// 2. Every MCQ must contain exactly FOUR options.
// 3. Exactly ONE option must be correct.
// 4. Distractors must be technically plausible.
// 5. Avoid trivial definition-based questions.

// Each MCQ must contain:

// - question_text
// - options
// - correct_answer
// - difficulty
// - skill_tag

// The skill_tag represents the engineering skill being evaluated.

// Examples of skill_tag:
// - Memory Management
// - Algorithmic Thinking
// - System Design
// - Resource Scheduling
// - Performance Optimization
// - Fault Tolerance

// --------------------------------------------------
// DESCRIPTIVE QUESTION DESIGN RULES
// --------------------------------------------------

// Descriptive questions must evaluate deeper reasoning.

// Each descriptive question should involve:

// • real-world engineering context
// • reasoning about system behavior
// • trade-offs or constraints
// • structured explanation

// Examples of scenarios:

// • system scalability
// • resource allocation
// • performance bottlenecks
// • architecture decisions
// • reliability issues

// Avoid questions that only ask for definitions.

// --------------------------------------------------
// RUBRIC GENERATION RULES
// --------------------------------------------------

// Each descriptive question MUST include 4–6 rubric evaluation points.

// These appear in the field:

// expected_points

// Each expected point represents a concept the student answer should contain.

// Rules for expected_points:

// 1. Each point must be a DISTINCT measurable concept.
// 2. Each point must be independently gradable.
// 3. Each point must represent a technical idea.
// 4. Each point must be concise (one sentence).
// 5. Avoid vague grading phrases.

// DO NOT use phrases like:

// • "good explanation"
// • "proper understanding"
// • "clear reasoning"

// Instead specify concrete concepts.

// Example:

// expected_points:

// [
// "Explains how paging divides memory into fixed-size frames",
// "Describes page table role in logical-to-physical address translation",
// "Mentions page fault handling mechanism",
// "Discusses performance trade-off between paging and segmentation"
// ]

// --------------------------------------------------
// INDUSTRY ALIGNMENT
// --------------------------------------------------

// Whenever possible, frame questions in realistic engineering contexts.

// Examples:

// • cloud infrastructure
// • distributed systems
// • mobile applications
// • database scaling
// • real-time systems
// • embedded systems

// However, DO NOT introduce topics outside the syllabus.

// --------------------------------------------------
// STRICT OUTPUT REQUIREMENTS
// --------------------------------------------------

// Your output will be parsed automatically by software.

// Therefore:

// 1. Output MUST be valid JSON.
// 2. Do NOT include explanations.
// 3. Do NOT include markdown formatting.
// 4. Do NOT include comments.
// 5. JSON must start with { and end with }.
// 6. Do NOT include trailing commas.

// --------------------------------------------------
// OUTPUT JSON STRUCTURE
// --------------------------------------------------

// {
//   "mcqs": [
//     {
//       "question_text": "",
//       "options": ["", "", "", ""],
//       "correct_answer": "",
//       "difficulty": "${context.difficulty}",
//       "skill_tag": ""
//     }
//   ],

//   "descriptive": [
//     {
//       "question_text": "",
//       "expected_points": [
//         "technical evaluation concept 1",
//         "technical evaluation concept 2",
//         "technical evaluation concept 3",
//         "technical evaluation concept 4"
//       ],
//       "difficulty": "${context.difficulty}",
//       "skill_tag": ""
//     }
//   ]
// }

// Ensure the number of MCQs equals ${context.pattern.mcq}  
// Ensure the number of descriptive questions equals ${context.pattern.descriptive}

// Return ONLY the JSON object.
