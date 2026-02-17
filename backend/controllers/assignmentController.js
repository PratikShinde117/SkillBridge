require("dotenv").config();
const db = require("../db");
const { createAssignment, addQuestion, updateQuestion, getQuestionsByAssignment, getAssignmentByID, updateAssignmentStatus, deleteAssignment, isPublished, getQuestionByQuestionID, getFacIDByAssignmentID, getAssignmentsForStudent, startAssignment,
    isSubmissionExpired, submitAssignment, getSubmissionDetails } = require("../models/assignmentModel.js");
const aiService = require("../services/aiService.js");

const developAssignment = async (req, res) => {

    try {
        const facid = req.faculty.facid;
        const facname = req.faculty.facname;

        const { subject, syllabus_description, difficulty_level, total_questions, mcq_count, descriptive_count, department, division, batch, generate_using_ai } = req.body;

        const assignment = await createAssignment({
            facid,
            subject,
            syllabus_description,
            difficulty_level,
            total_questions,
            mcq_count,
            descriptive_count,
            department,
            division,
            batch,
            ai_generated: generate_using_ai,
            created_by: facname
        });


        if (generate_using_ai) {
            const Questions = await aiService.generateQuestions({
                subject,
                syllabus_description,
                difficulty_level,
                mcq_count,
                descriptive_count
            });

            for (const q of Questions.mcqs) {
                await addQuestion(assignment.assignment_id, facname, {
                    question_text: q.question_text,
                    question_type: "mcq",
                    options: q.options,
                    correct_answer: q.correct_answer,
                    difficulty: q.difficulty
                });
            }


            for (const q of Questions.descriptive) {
                await addQuestion(assignment.assignment_id, facname, {
                    question_text: q.question_text,
                    question_type: "descriptive",
                    expected_points: q.expected_points,
                    difficulty: q.difficulty
                });
            }
        }



        res.status(200).json({
            success: true,
            assignment
        })

    } catch (err) {
        console.error("Error during assignment generation:", err.message);
        res.status(500).json({ error: "Server error during assignment generation", reason: err });
    }


}

const addQuestionByFaculty = async (req, res) => {

    try {
        const facname = req.faculty.facname;
        const facid = req.faculty.facid;

        const { assignment_id } = req.params;


        if (!assignment_id) {
            return res.status(404).json({
                error: "Question not found"
            });
        }

        const assignment_creater = await getFacIDByAssignmentID(assignment_id);

        if (assignment_creater != facid) {
            return res.status(400).json({
                error: "Faculty not authorized to edit assignment!"
            })
        }

        const published = await isPublished(assignment_id);

        if (published) {
            return res.status(400).json({
                error: "The assignment already published and not editable!"
            })
        }

        const questionData = req.body;

        const newQuestion = await addQuestion(assignment_id, facname, {
            ...questionData,
            created_source: "faculty"
        })


        res.json({
            success: true,
            question: newQuestion
        });

    } catch (err) {
        console.error("Add question error:", err.message);
        res.status(500).json({ error: "Failed to add question" });
    }
}

const updateQuestionByFaculty = async (req, res) => {
    try {
        const facname = req.faculty.facname;
        const facid = req.faculty.facid;

        const { question_id } = req.params;
        const upadtedQuestion = req.body;

        const assignment_id = await getQuestionByQuestionID(question_id);

        console.log(assignment_id);

        if (!assignment_id) {
            return res.status(404).json({
                error: "Question not found"
            });
        }

        const assignment_creater = await getFacIDByAssignmentID(assignment_id);

        if (assignment_creater != facid) {
            return res.status(400).json({
                error: "Faculty not authorized to edit assignment!"
            })
        }


        const published = await isPublished(assignment_id);

        if (published) {
            return res.status(400).json({
                error: "The assignment already published and not editable!"
            })
        }

        const updated = await updateQuestion(question_id, upadtedQuestion);

        return res.json({
            success: true,
            updatedQue: updated
        });
    } catch (err) {
        console.error("Update question error:", err.message);
        res.status(500).json({ error: "Failed to update question" });
    }
}


const getAssignmentQuestions = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        console.log(assignment_id);
        const getAssignment = await getQuestionsByAssignment(assignment_id);
        console.log(getAssignment);

        res.json({
            getAssignment
        });
    } catch (err) {
        console.error("Fetch questions error:", err.message);
        res.status(500).json({ error: "Failed to fetch questions" });
    }
}


const publishAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.body;
        const facid = req.faculty.facid;

        const assignmentResult = await getAssignmentByID(assignment_id);


        if (!assignmentResult) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        if (Number(assignmentResult.facid) !== Number(facid)) {
            return res.status(403).json({ error: "Not authorized to publish this assignment" });
        }

        if (assignmentResult.status !== "draft") {
            return res.status(400).json({
                error: `Assignment already ${assignmentResult.status}`
            })
        }

        const question = await getQuestionsByAssignment(assignment_id);
        console.log(question);

        if (!question || question.length == 0) {
            return res.status(400).json({
                error: "Cannot publish assignment without questions"
            });
        }

        const publishAssignment = await updateAssignmentStatus(
            assignment_id,
            "published"
        );

        res.status(200).json({
            success: true,
            message: "Assignment published successfully",
            assignment: publishAssignment
        });

    } catch (err) {
        console.error("Error while publishing assignment:", err.message);
        res.status(500).json({
            error: "Server error while publishing assignment",
            reason: err.message
        });
    }
}

const removeAssignment = async (req, res) => {
    try {
        const facid = req.faculty.facid;
        const assignment_id = Number(req.params.assignment_id);

        if (isNaN(assignment_id)) {
            return res.status(400).json({ error: "Invalid assignment ID" });
        }

        const assignment = await getAssignmentByID(assignment_id);

        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        console.log(assignment.facid + " " + facid);

        if (assignment.facid != facid) {
            return res.status(403).json({
                error: "Faculty not authorized to delete this assignment"
            });
        }


        const deletedAssignment = await deleteAssignment(assignment_id);

        return res.json({
            success: true,
            deleted_assignment: deletedAssignment
        });

    } catch (err) {
        console.error("Remove assignment error:", err.message);
        return res.status(500).json({ error: "Failed to delete assignment" });
    }
};

const getAssignmentsForStudentDashboard = async (req, res) => {
    try {

        const div = req.user.studdiv;
        const dept = req.user.studdept;

        console.log(div + " " + typeof div + " " + dept + " " + typeof dept);

        const get_assignment = await getAssignmentsForStudent(dept, div);

        console.log(get_assignment);

        if (get_assignment.length === 0) {
            return res.json({
                success: true,
                get_assignment,
                message: "No assignments available"
            });
        }

        res.json({
            success: true,
            get_assignment,

        });
    } catch (err) {
        res.status(500).json({ error: "Failed to load assignments" });
    }


}


const startTest = async (req, res) => {
    try
    {const roll_no = req.user.roll_no;
    const { assignment_id } = req.params;

    console.log(assignment_id + " " + roll_no);

    const submission = await startAssignment(assignment_id, roll_no);
    
    console.log(submission);

    res.json({
        success: true,
        submission_id: submission.submission_id,
        started_at: submission.started_at,
        duration_minutes: submission.duration_minutes
    })}
    catch(err){
        
        res.status(400).json({
            error : err.message
        })
    }
}

const fetchQuestions = async(req,res) => {
    const {assignment_id} = req.params;
    console.log(assignment_id);
    const questions = await getQuestionsByAssignment(assignment_id);

    res.json({
        success : true,
        questions
    })
}



const submitTest = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const { answers } = req.body;

    const roll_no =
      req.student?.roll_no || req.user?.roll_no;

    if (!roll_no) {
      return res.status(400).json({ error: "Student not found" });
    }

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ error: "No answers submitted" });
    }

    // 🔒 Check existing submission
    const existing = await db.query(
      `SELECT * FROM assignment_submissions
       WHERE assignment_id = $1 AND roll_no = $2`,
      [assignment_id, roll_no]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Test already submitted"
      });
    }

    // 🧠 Save submission
    const result = await db.query(
      `INSERT INTO assignment_submissions
       (assignment_id, roll_no, answers, status, submitted_at)
       VALUES ($1, $2, $3, 'Submitted', NOW())
       RETURNING status, submitted_at`,
      [assignment_id, roll_no, JSON.stringify(answers)]
    );

    res.json({
      success: true,
      status: result.rows[0].status,
      submitted_at: result.rows[0].submitted_at
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submission failed" });
  }
};



const get_assignment_details = async(req, res) => {
    try{
        const roll = req.user.roll_no;
        console.log(roll);
        const get_details = await getSubmissionDetails(roll);
        if(!get_details){
            res.status(400).json({
                message: "Submission details not exist"
            });
        }
        res.json({
            success:true,
            get_details
        })
    }catch(err){
        res.status(400).json({error : err});
    }
};

module.exports = {
    developAssignment,
    addQuestionByFaculty,
    getAssignmentQuestions,
    updateQuestionByFaculty,
    publishAssignment,
    removeAssignment,
    getAssignmentsForStudentDashboard,
    startTest,
    fetchQuestions,
    submitTest,
    get_assignment_details

}