const express = require("express");
const multer = require("multer");
const { uploadResume, skillAnalysis } = require("../models/resumeModel");
const {registerStud, loginStud, logoutStud, getProfile} = require("../controllers/studentController.js");
const {registerFac,loginFac,logoutFac,getProfileFac } = require("../controllers/teacherController.js");
const {developAssignment,addQuestionByFaculty,getAssignmentQuestions,updateQuestionByFaculty,publishAssignment,removeAssignment,
    getAssignmentsForStudentDashboard,startTest,fetchQuestions,submitTest, get_assignment_details } = require("../controllers/assignmentController.js");
const authMiddleware = require("../middleware/authMiddleware.js");
const facultyAuth = require("../middleware/authFacMiddleware.js");
const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post("/upload-resume", authMiddleware, upload.single("file"), uploadResume);
router.post("/skill-analysis",authMiddleware,  skillAnalysis);
router.post("/register-student", registerStud);
router.post("/login-student", loginStud);
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
router.get("/student/submission-details", authMiddleware, get_assignment_details);
router.get("/assignments/:assignment_id/start", authMiddleware, startTest);
router.get("/assignments/:assignment_id/questions", authMiddleware, fetchQuestions);
router.post("/assignments/:assignment_id/submit" , authMiddleware, submitTest);


module.exports = router;
