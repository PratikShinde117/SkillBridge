require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const cleanAIResponse = (text) => {
  let cleaned = text.replace(/```json|```/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON found in AI response");
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
};


const generateQuestions = async ({
    subject,
    syllabus_description,
    difficulty_level,
    mcq_count,
    descriptive_count
}) => {

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//         const prompt = `
// You are an AI assistant helping an academic institution generate industry-aligned assignments.
// You MUST strictly follow the constraints.

// Subject: ${subject}
// Syllabus Scope: ${syllabus_description}
// Difficulty Level: ${difficulty_level}

// Question Distribution:
// - MCQs: ${mcq_count}
// - Descriptive: ${descriptive_count}

// Rules:
// 1. Questions must be strictly limited to the given syllabus.
// 2. Do NOT introduce advanced or unrelated topics.
// 3. Descriptive questions must focus on real-world or industry scenarios.
// 4. MCQs must have exactly 4 options and one correct answer.
// 5. Output must be valid JSON ONLY.
// 6. Do not include explanations or extra text.

// Output JSON format:
// {
//   "mcqs": [
//     {
//       "question_text": "",
//       "options": ["", "", "", ""],
//       "correct_answer": "",
//       "difficulty": "${difficulty_level}"
//     }
//   ],
//   "descriptive": [
//     {
//       "question_text": "",
//       "expected_points": ["", "", ""],
//       "difficulty": "${difficulty_level}"
//     }
//   ]
// }
// `;





const prompt = `
You are an AI assistant supporting an academic institution to design
INDUSTRY-ALIGNED ASSIGNMENTS.

The goal is NOT to test rote memorization, but to evaluate:
- real-world problem solving
- applied understanding of core concepts
- industry-style thinking expected from entry-level engineers

------------------------------------
ACADEMIC CONTEXT
------------------------------------
Subject: ${subject}
Syllabus Scope (STRICT BOUNDARY):
${syllabus_description}

Difficulty Level: ${difficulty_level}

Question Distribution:
- MCQs: ${mcq_count}
- Descriptive: ${descriptive_count}

------------------------------------
QUESTION DESIGN GUIDELINES (MANDATORY)
------------------------------------
1. All questions MUST stay strictly within the given syllabus.
2. Questions must be framed in PRACTICAL or INDUSTRY-LIKE scenarios.
3. Avoid purely theoretical or definition-based questions.
4. Descriptive questions should simulate:
   - real system behavior
   - real engineering decisions
   - performance, scalability, or reliability considerations
5. MCQs should test applied understanding (e.g., "What happens if...", "Which choice best fits this scenario...")
6. Assume the student is a FINAL-YEAR ENGINEERING STUDENT preparing for industry roles.
7. Do NOT introduce advanced technologies outside the syllabus.
8. Do NOT include solutions or explanations.

------------------------------------
OUTPUT FORMAT (STRICT)
------------------------------------
- Output MUST be valid JSON only.
- Do NOT include markdown, comments, or extra text.
- JSON must start with { and end with }.

Output JSON structure:
{
  "mcqs": [
    {
      "question_text": "",
      "options": ["", "", "", ""],
      "correct_answer": "",
      "difficulty": "${difficulty_level}"
    }
  ],
  "descriptive": [
    {
      "question_text": "",
      "expected_points": ["", "", ""],
      "difficulty": "${difficulty_level}"
    }
  ]
}
`;




        const result = await model.generateContent(prompt);
        const responseText = result.response.text();


        let parsed;
        try {
            const cleaned = cleanAIResponse(responseText);
            parsed = JSON.parse(cleaned);

        } catch (err) {
            console.error("Raw AI response:", responseText);
            throw new Error("AI response is not valid JSON");
        }

        if (parsed.mcqs.length !== mcq_count) {
  throw new Error("AI returned incorrect number of MCQs");
}

if (parsed.descriptive.length !== descriptive_count) {
  throw new Error("AI returned incorrect number of descriptive questions");
}


        return parsed;

    } catch (error) {
        console.error("AI Service Error:", error.message);
        throw new Error("Failed to generate assignment using AI");
    }
};

module.exports = {
    generateQuestions
};
