const express = require("express");
const multer = require("multer");
const { uploadResume, skillAnalysis } = require("../models/resumeModel");
const {registerStud, loginStud, logoutStud, getProfile} = require("../controllers/studentController.js");
const {registerFac,loginFac,logoutFac,getProfileFac } = require("../controllers/teacherController.js");
const {developAssignment,addQuestionByFaculty,getAssignmentQuestions,updateQuestionByFaculty,publishAssignment,removeAssignment,
    getAssignmentsForStudentDashboard,startTest,fetchQuestions,submitTest, get_assignment_details, saveProgress, fetchQuestionsForFaculty, getAssignmentBrief, getAssignmentsForFaculty, getFacultyAssignmentDetail, getAssignmentAnalyticsForFaculty, saveAssignmentFeedbackForFaculty, getAdminDashboard,
  getAllFaculty,
  getAllStudents } = require("../controllers/assignmentControllerV2.js");
const authMiddleware = require("../middleware/authMiddleware.js");
const { loginLimiter } = require("../middleware/rateLimiter");
const { submitLimiter } = require("../middleware/rateLimiter");
const facultyAuth = require("../middleware/authFacMiddleware.js");
const adminOnly = require("../middleware/adminOnly");
const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.post("/upload-resume", authMiddleware, upload.single("file"), uploadResume);
router.post("/skill-analysis",authMiddleware,  skillAnalysis);
router.post("/register-student", registerStud);
router.post("/login-student", loginLimiter, loginStud);
router.post("/logout-student", authMiddleware, logoutStud);
router.get("/get-profile", authMiddleware, getProfile);

router.post("/register-faculty", registerFac);
router.post("/login-faculty", loginFac);
router.post("/logout-faculty", facultyAuth, logoutFac);
router.get("/get-faculty-profile", facultyAuth, getProfileFac);

router.post("/create-assignment", facultyAuth, developAssignment);
router.post("/add-question/:assignment_id", facultyAuth, addQuestionByFaculty);
router.put("/update-question/:question_id", facultyAuth, updateQuestionByFaculty);
router.get("/get-questions/:assignment_id",facultyAuth,  getAssignmentQuestions);
router.post("/publish-assignment", facultyAuth, publishAssignment);
router.delete("/delete-assignment/:assignment_id", facultyAuth, removeAssignment);

router.get("/student/dashboard", authMiddleware, getAssignmentsForStudentDashboard);
router.get("/admin/dashboard", facultyAuth, adminOnly, getAdminDashboard);
router.get("/faculty", facultyAuth, adminOnly, getAllFaculty);
router.get("/students", facultyAuth, adminOnly, getAllStudents);
router.get("/student/submission-details", authMiddleware, get_assignment_details);
router.get("/assignments/:assignment_id/start", authMiddleware, startTest);
router.get("/assignments/:assignment_id/questions", authMiddleware, fetchQuestions);
router.post("/assignments/:assignment_id/submit" , authMiddleware, submitLimiter ,submitTest);
router.patch("/assignments/:assignment_id/save-progress", authMiddleware, saveProgress);
router.get("/faculty/assignment/:assignment_id/questions", facultyAuth, fetchQuestionsForFaculty);
router.get("/faculty/assignment/:assignment_id", facultyAuth, getFacultyAssignmentDetail);
router.get("/api/analytics/assignment/:assignment_id", facultyAuth, getAssignmentAnalyticsForFaculty);
router.post("/api/analytics/assignment/:assignment_id/feedback", facultyAuth, saveAssignmentFeedbackForFaculty);
router.get("/assignments/:assignment_id/brief",authMiddleware,getAssignmentBrief);
router.get("/faculty/view-assignments", facultyAuth, getAssignmentsForFaculty);




module.exports = router;
