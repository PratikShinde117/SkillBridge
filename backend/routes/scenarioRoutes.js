const express = require("express");
const router = express.Router();
const facultyAuth = require("../middleware/authFacMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const {
  searchScenarios,
  getAllScenarios,
  getScenarioDetail,
  generateScenario,
  modifyScenario,
  saveScenario,
  updateScenario,
  deleteScenario,
  createScenarioAssignment,
  publishScenarioAssignment,
  getScenariosForStudent
} = require("../controllers/scenarioControllerV2");
const { aiLimiter } = require("../middleware/rateLimiter");

// Faculty routes
router.get("/all", facultyAuth, getAllScenarios);
router.get("/search", facultyAuth, searchScenarios);
router.post("/generate", facultyAuth, aiLimiter, generateScenario);
router.post("/modify", facultyAuth, aiLimiter, modifyScenario);
router.post("/save", facultyAuth, saveScenario);
router.put("/:scenario_id", facultyAuth, updateScenario);
router.delete("/:scenario_id", facultyAuth, deleteScenario);
router.post("/create-assignment", facultyAuth, createScenarioAssignment);
router.post("/publish-assignment", facultyAuth, publishScenarioAssignment);

// Keep detail route AFTER /all, /search etc. to avoid catching them as :scenario_id
router.get("/detail/:scenario_id", facultyAuth, getScenarioDetail);

// Student routes
router.get("/assignment/:assignment_id/scenarios", authMiddleware, getScenariosForStudent);

module.exports = router;
