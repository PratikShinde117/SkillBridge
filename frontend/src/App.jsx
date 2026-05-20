import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import StudentDashboard from "./pages/student/StudentDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import UnifiedAssignmentAttempt from "./pages/student/UnifiedAssignmentAttempt";
import PublishedAssignment from "./pages/faculty/PublishedAssignment"
import ViewAssignments from "./pages/faculty/ViewAssignments"
import FacultyAnalytics from "./pages/faculty/FacultyAnalytics"
import Profile from "./pages/faculty/Profile"
import CreateAssignment from "./pages/faculty/CreateAssignment";
import MissionBrief from "./pages/student/MissionBrief";
import AssignmentQuestions from './pages/faculty/AssignmentQuestions';
import UnifiedEvaluationPage from "./pages/student/UnifiedEvaluationPage";

// ---- SCENARIO PAGES ----
import ScenarioSearch from "./pages/faculty/ScenarioSearch";
import ScenarioGenerate from "./pages/faculty/ScenarioGenerate";
import ScenarioModify from "./pages/faculty/ScenarioModify";
import CreateScenarioAssignment from "./pages/faculty/CreateScenarioAssignment";
import AdminDashboard from "./pages/faculty/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/assignments/:assignment_id/start" element={<UnifiedAssignmentAttempt />} />
        <Route path="/assignments/:assignment_id/submit" element={<UnifiedAssignmentAttempt />} />
        <Route path="/faculty/published" element={<PublishedAssignment/>}></Route>
        <Route path="/faculty/create-assignment" element={<CreateAssignment/>}></Route>
        <Route path="/faculty/view-assignments" element={<ViewAssignments/>}></Route>
         <Route path="/faculty/profile" element={<Profile/>}></Route>
          <Route path="/faculty/analytics" element={<FacultyAnalytics/>}></Route>
          <Route path="/faculty/analytics/:assignment_id" element={<FacultyAnalytics/>}></Route>
          <Route path="/assignments/:assignment_id/brief" element={<MissionBrief/>}></Route>
          <Route path="/student/evaluation/:roll_no/:assignment_id" element={<UnifiedEvaluationPage />} />
          <Route
  path="/faculty/assignment/:assignment_id/questions"
  element={<AssignmentQuestions />}
/>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        {/* ---- SCENARIO ROUTES ---- */}
        <Route path="/faculty/scenarios" element={<ScenarioSearch />} />
        <Route path="/faculty/scenarios/generate" element={<ScenarioGenerate />} />
        <Route path="/faculty/scenarios/modify" element={<ScenarioModify />} />
        <Route path="/faculty/scenarios/create-assignment" element={<CreateScenarioAssignment />} />
        <Route path="/student/scenario-test/:assignment_id" element={<UnifiedAssignmentAttempt />} />
        <Route path="/student/scenario-result/:roll_no/:assignment_id" element={<UnifiedEvaluationPage />} />
      </Routes>
    </BrowserRouter>
  );
} 

export default App;
