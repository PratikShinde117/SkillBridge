import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import eval_api from "../../api/evaluation";

const matchesAssignmentAccess = (assignment, studentProfile) => {
  if (!assignment || !studentProfile) return false;

  const normalize = (value) => String(value || "").trim().toLowerCase();
  const studentYear =
    studentProfile.student_year != null ? Number(studentProfile.student_year) : null;
  const assignmentYear =
    assignment.year != null ? Number(assignment.year) : null;

  return (
    normalize(studentProfile.studdept) === normalize(assignment.department) &&
    normalize(studentProfile.studdiv) === normalize(assignment.division) &&
    studentYear !== null &&
    assignmentYear !== null &&
    studentYear === assignmentYear
  );
};

const NAV_ITEMS = [
  { label: "Dashboard", id: "dashboard" },
  { label: "Question Assignments", id: "questions" },
  { label: "Scenario Assignments", id: "scenarios" },
  { label: "Completed", id: "completed" },
  { label: "Resume Analyzer", id: "resume" },
];

const StudentDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [assignmentStatus, setAssignmentStatus] = useState({});
  const [activePage, setActivePage] = useState("dashboard");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentProfile, setStudentProfile] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchSubmissionDetails();
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const loadDashboard = async () => {
    try {
      await Promise.all([fetchAssignments(), fetchSubmissionDetails(), fetchStudentInfo()]);
    } finally { setLoading(false); }
  };

  const fetchStudentInfo = async () => {
    try {
      const res = await api.get("/get-profile");
      setStudentName(res.data.student.studname);
      setStudentId(res.data.student.roll_no);
      setStudentProfile(res.data.student);
    } catch {}
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/student/dashboard");
      const fetchedAssignments = res.data?.assignments || res.data?.get_assignment || [];
      setAssignments(fetchedAssignments);
    } catch {}
  };


  const filteredAssignments = assignments;

  const fetchSubmissionDetails = async () => {
    try {
      const res = await api.get("/student/submission-details");
      const statusMap = {};
      res.data?.details?.forEach((item) => { statusMap[item.assignment_id] = item.status; });
      setAssignmentStatus(statusMap);
    } catch {}
  };

  const handleLogout = async () => {
    try { await api.post("/logout-student"); } catch {}
    navigate("/");
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError("Please select a resume file"); return; }
    setError("");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await api.post("/upload-resume", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadSuccess(true);
      setShowUploadModal(false);
      setSelectedFile(null);
    } catch (err) { setError(err.response?.data?.error || "Upload failed"); }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzeLoading(true);
      setAnalysis(null);
      const res = await api.post("/skill-analysis");
      setAnalysis(res.data.analysis);
    } catch { alert("Skill analysis failed"); }
    finally { setAnalyzeLoading(false); }
  };

  // Derived data
  const isCompleted = (status) => status === "submitted" || status === "auto_submitted";

  const activeQuestionAssignments = assignments.filter(a => {
    const st = assignmentStatus[a.assignment_id];
    return !st && a.assignment_type !== "scenario";
  });
  const activeScenarioAssignments = assignments.filter(a => {
    const st = assignmentStatus[a.assignment_id];
    return !st && a.assignment_type === "scenario";
  });
  const completedAssignments = assignments.filter(a => isCompleted(assignmentStatus[a.assignment_id]));

  const totalActive = activeQuestionAssignments.length + activeScenarioAssignments.length;
  const totalCompleted = completedAssignments.length;

  const STATS = [
    { value: assignments.length, label: "Total Assigned", icon: "📚", color: "#6366f1", bg: "#ede9fe" },
    { value: activeQuestionAssignments.length, label: "Question Pending", icon: "📝", color: "#2563eb", bg: "#dbeafe" },
    { value: activeScenarioAssignments.length, label: "Scenario Pending", icon: "🎯", color: "#7c3aed", bg: "#f3e8ff" },
    { value: totalCompleted, label: "Completed", icon: "✅", color: "#059669", bg: "#ecfdf5" },
  ];

  // ===== RENDER HELPERS =====
  const renderAssignmentCard = (item, showEval = false) => {
    const status = assignmentStatus[item.assignment_id];
    const isScenario = item.assignment_type === "scenario";
    const locked = isCompleted(status);
    const evalPath = isScenario
      ? `/student/scenario-result/${studentId}/${item.assignment_id}`
      : `/student/evaluation/${studentId}/${item.assignment_id}`;

    const handleStart = () => {
      if (isScenario) navigate(`/student/scenario-test/${item.assignment_id}`);
      else navigate(`/assignments/${item.assignment_id}/brief`);
    };

    const deadlineDate = item.deadline ? new Date(item.deadline) : null;
    const isUrgent = deadlineDate && (deadlineDate - Date.now()) < 86400000 * 2 && !locked;

    return (
      <div key={item.assignment_id} style={{
        ...S.aCard,
        borderLeft: isScenario ? "4px solid #8b5cf6" : "4px solid #3b82f6",
        ...(isUrgent ? { boxShadow: "0 0 0 1px #fecaca, 0 2px 8px rgba(239,68,68,.08)" } : {}),
      }}>
        <div style={S.aCardTop}>
          <div style={{ flex: 1 }}>
            <div style={S.aCardMeta}>
              <span style={isScenario ? S.typeScenario : S.typeQuestion}>
                {isScenario ? "🎯 Scenario" : "📝 Question"}
              </span>
              <span style={S.aId}>#{item.assignment_id}</span>
              {isUrgent && <span style={S.urgentBadge}>⚡ Due Soon</span>}
            </div>
            <h3 style={S.aSubject}>{item.subject}</h3>
          </div>
          <span style={locked ? S.statusDone : S.statusPending}>
            {status || "Not Started"}
          </span>
        </div>

        <div style={S.aDetails}>
          <div style={S.aDetail}>
            <span style={S.aDetailLabel}>📅 Deadline</span>
            <span style={S.aDetailVal}>{deadlineDate ? deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
          </div>
          <div style={S.aDetail}>
            <span style={S.aDetailLabel}>⏱ Duration</span>
            <span style={S.aDetailVal}>{item.duration_minutes} min</span>
          </div>
          {item.year && (
            <div style={S.aDetail}>
              <span style={S.aDetailLabel}>🎓 Year</span>
              <span style={S.aDetailVal}>{item.year}</span>
            </div>
          )}
        </div>

        <div style={S.aCardBottom}>
          {!showEval ? (
            <button
              disabled={locked}
              onClick={handleStart}
              style={{
                ...S.startBtn,
                background: locked ? "#e2e8f0" : isScenario ? "linear-gradient(135deg,#7c3aed,#8b5cf6)" : "linear-gradient(135deg,#2563eb,#3b82f6)",
                color: locked ? "#94a3b8" : "#fff",
                cursor: locked ? "not-allowed" : "pointer",
              }}
            >
              {locked ? "Completed" : isScenario ? "Start Scenario →" : "Start Test →"}
            </button>
          ) : (
            <div style={S.evalRow}>
              <button style={S.evalBtn} onClick={() => navigate(evalPath)}>
                📊 View Results
              </button>
              {status && <span style={S.statusSmall}>{status}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== LOADING SKELETON =====
  if (loading) {
    return (
      <div style={S.shell}>
        <aside style={S.sidebar}><div style={{ padding: 40 }} /></aside>
        <main style={S.main}>
          <h2 style={{ color: "#94a3b8", fontWeight: 500, marginBottom: 20 }}>Loading dashboard...</h2>
          <div style={S.statsGrid}>
            {[1,2,3,4].map(i => <div key={i} style={S.skelCard} />)}
          </div>
        </main>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div style={S.shell}>
      {/* ===== SIDEBAR ===== */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          <div style={S.logoWrap}>
            <div style={S.logoBox}>SB</div>
            <div>
              <div style={S.logoTitle}>SkillBridge</div>
              <div style={S.logoSub}>Student Portal</div>
            </div>
          </div>
          <nav style={S.nav}>
            {NAV_ITEMS.map((item, i) => {
              const active = activePage === item.id;
              return (
                <button
                  key={i}
                  style={active ? S.navActive : S.navBtn}
                  onClick={() => setActivePage(item.id)}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={S.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                  {/* Count badges */}
                  {item.id === "questions" && activeQuestionAssignments.length > 0 && (
                    <span style={S.countBadge}>{activeQuestionAssignments.length}</span>
                  )}
                  {item.id === "scenarios" && activeScenarioAssignments.length > 0 && (
                    <span style={S.countBadge}>{activeScenarioAssignments.length}</span>
                  )}
                  {item.id === "completed" && totalCompleted > 0 && (
                    <span style={S.countBadgeGreen}>{totalCompleted}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div style={S.sideBottom}>
          <div style={S.userBox}>
            <div style={S.avatar}>{studentName?.[0]?.toUpperCase() || "S"}</div>
            <div style={S.userInfo}>
              <div style={S.userName}>{studentName || "Student"}</div>
              <div style={S.userId}>Roll: {studentId}</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={handleLogout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main style={S.main}>

        {/* ========================= DASHBOARD ========================= */}
        {activePage === "dashboard" && (
          <>
            <header style={S.header}>
              <div>
                <h1 style={S.pageTitle}>
                  Welcome back, <span style={S.nameHL}>{studentName || "Student"}</span>
                </h1>
                <p style={S.pageSub}>Here's your assignment overview.</p>
              </div>
              <span style={S.dateBadge}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </header>

            {/* Stats */}
            <div style={S.statsGrid}>
              {STATS.map((stat, i) => (
                <div key={i} style={S.statCard}>
                  <div style={{ ...S.statIcon, background: stat.bg, color: stat.color }}>{stat.icon}</div>
                  <div>
                    <div style={S.statValue}>{stat.value}</div>
                    <div style={S.statLabel}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <h2 style={S.sectionTitle}>Quick Actions</h2>
            <div style={S.qaGrid}>
              <button style={S.qaCard} onClick={() => setActivePage("questions")}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ ...S.qaIcon, background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>📝</div>
                <div>
                  <div style={S.qaTitle}>Question Assignments</div>
                  <div style={S.qaDesc}>{activeQuestionAssignments.length} pending</div>
                </div>
                <span style={S.qaArrow}>→</span>
              </button>
              <button style={S.qaCard} onClick={() => setActivePage("scenarios")}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ ...S.qaIcon, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)" }}>🎯</div>
                <div>
                  <div style={S.qaTitle}>Scenario Assignments</div>
                  <div style={S.qaDesc}>{activeScenarioAssignments.length} pending</div>
                </div>
                <span style={S.qaArrow}>→</span>
              </button>
              <button style={S.qaCard} onClick={() => setActivePage("completed")}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ ...S.qaIcon, background: "linear-gradient(135deg,#059669,#10b981)" }}>✅</div>
                <div>
                  <div style={S.qaTitle}>Completed</div>
                  <div style={S.qaDesc}>{totalCompleted} assignments</div>
                </div>
                <span style={S.qaArrow}>→</span>
              </button>
              <button style={S.qaCard} onClick={() => setActivePage("resume")}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ ...S.qaIcon, background: "linear-gradient(135deg,#d97706,#f59e0b)" }}>📄</div>
                <div>
                  <div style={S.qaTitle}>Resume Analyzer</div>
                  <div style={S.qaDesc}>Upload & analyze</div>
                </div>
                <span style={S.qaArrow}>→</span>
              </button>
            </div>

            {/* Upcoming Deadlines */}
            {totalActive > 0 && (
              <>
                <h2 style={{ ...S.sectionTitle, marginTop: 32 }}>Upcoming Deadlines</h2>
                <div style={S.cardList}>
                  {[...activeQuestionAssignments, ...activeScenarioAssignments]
                    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                    .slice(0, 4)
                    .map(item => renderAssignmentCard(item))}
                </div>
              </>
            )}
          </>
        )}

        {/* ========================= QUESTION ASSIGNMENTS ========================= */}
        {activePage === "questions" && (
          <>
            <header style={S.header}>
              <div>
                <h1 style={S.pageTitle}>📝 Question-Based Assignments</h1>
                <p style={S.pageSub}>{activeQuestionAssignments.length} pending assignment{activeQuestionAssignments.length !== 1 ? "s" : ""}</p>
              </div>
            </header>
            {activeQuestionAssignments.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>📝</div>
                <h3 style={S.emptyTitle}>No pending question assignments</h3>
                <p style={S.emptyDesc}>You're all caught up! Check back later for new assignments.</p>
              </div>
            ) : (
              <div style={S.cardList}>
                {activeQuestionAssignments.map(item => renderAssignmentCard(item))}
              </div>
            )}
          </>
        )}

        {/* ========================= SCENARIO ASSIGNMENTS ========================= */}
        {activePage === "scenarios" && (
          <>
            <header style={S.header}>
              <div>
                <h1 style={S.pageTitle}>🎯 Scenario-Based Assignments</h1>
                <p style={S.pageSub}>{activeScenarioAssignments.length} pending scenario{activeScenarioAssignments.length !== 1 ? "s" : ""}</p>
              </div>
            </header>
            {activeScenarioAssignments.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>🎯</div>
                <h3 style={S.emptyTitle}>No pending scenario assignments</h3>
                <p style={S.emptyDesc}>Scenario-based assignments will appear here when assigned by your faculty.</p>
              </div>
            ) : (
              <div style={S.cardList}>
                {activeScenarioAssignments.map(item => renderAssignmentCard(item))}
              </div>
            )}
          </>
        )}

        {/* ========================= COMPLETED ========================= */}
        {activePage === "completed" && (
          <>
            <header style={S.header}>
              <div>
                <h1 style={S.pageTitle}>✅ Completed Assignments</h1>
                <p style={S.pageSub}>{totalCompleted} completed assignment{totalCompleted !== 1 ? "s" : ""}</p>
              </div>
            </header>
            {totalCompleted === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>📭</div>
                <h3 style={S.emptyTitle}>No completed assignments yet</h3>
                <p style={S.emptyDesc}>Assignments you've submitted will appear here with evaluation results.</p>
              </div>
            ) : (
              <div style={S.cardList}>
                {completedAssignments.map(item => renderAssignmentCard(item, true))}
              </div>
            )}
          </>
        )}

        {/* ========================= RESUME ANALYZER ========================= */}
        {activePage === "resume" && (
          <>
            <header style={S.header}>
              <div>
                <h1 style={S.pageTitle}>📄 Resume Skill Analyzer</h1>
                <p style={S.pageSub}>Upload your resume and get AI-powered skill analysis</p>
              </div>
            </header>

            <div style={S.resumeCard}>
              <div style={S.resumeUploadArea}>
                <div style={S.uploadIcon}>📤</div>
                <h3 style={S.uploadTitle}>Upload Your Resume</h3>
                <p style={S.uploadDesc}>PDF, DOC, or DOCX — max 5MB</p>
                <button style={S.uploadBtn} onClick={() => setShowUploadModal(true)}>
                  Choose File & Upload
                </button>
                {uploadSuccess && (
                  <div style={S.uploadSuccess}>
                    <span>✅ Resume uploaded successfully</span>
                    <button style={S.analyzeBtn} onClick={handleAnalyze} disabled={analyzeLoading}>
                      {analyzeLoading ? "Analyzing..." : "🧠 Analyze Skills"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Loading */}
            {analyzeLoading && (
              <div style={S.analysisCard}>
                <h3 style={{ color: "#6366f1", marginBottom: 16 }}>Analyzing your resume...</h3>
                {[1,2,3,4,5].map(i => <div key={i} style={S.skelLine} />)}
              </div>
            )}

            {/* Analysis Results */}
            {!analyzeLoading && analysis && (
              <div style={S.analysisCard}>
                <h2 style={S.analysisTitle}>📊 Skill Analysis Report</h2>
                <div style={S.analysisGrid}>
                  <div style={S.analysisStat}>
                    <div style={S.analysisStatLabel}>🎯 Career Goal</div>
                    <div style={S.analysisStatValue}>{analysis.goal}</div>
                  </div>
                  <div style={S.analysisStat}>
                    <div style={S.analysisStatLabel}>🚀 Readiness Score</div>
                    <div style={S.analysisStatValue}>{analysis.readiness_score}/10</div>
                  </div>
                </div>

                <div style={S.analysisSections}>
                  {/* {[
                    { title: "🧠 Core Technical Skills", data: analysis.core_skills },
                    { title: "🤝 Soft Skills", data: analysis.soft_skills },
                    { title: "💪 Strengths", data: analysis.strengths },
                    { title: "⚠️ Weaknesses", data: analysis.weaknesses },
                    { title: "🏭 Industry Expectations", data: analysis.industry_needs },
                  ].map((sec, i) => sec.data?.length > 0 && (
                    <div key={i} style={S.analysisSection}>
                      <h4 style={S.analysisSectionTitle}>{sec.title}</h4>
                      <div style={S.chipWrap}>
                        {sec.data.map((item, j) => <span key={j} style={S.analysisChip}>{item}</span>)}
                      </div>
                    </div>
                  ))} */}


                    <div style={S.analysisSections}>
  {[
    { title: "🧠 Core Technical Skills", data: analysis.core_skills, color: "#6366f1" },
    { title: "🤝 Soft Skills", data: analysis.soft_skills, color: "#10b981" },
    { title: "💪 Strengths", data: analysis.strengths, color: "#2563eb" },
    { title: "⚠️ Weaknesses", data: analysis.weaknesses, color: "#f59e0b" },
    { title: "🏭 Industry Expectations", data: analysis.industry_needs, color: "#8b5cf6" },
  ].map((sec, i) => sec.data?.length > 0 && (
    <div key={i} style={S.analysisSectionCard}>
      
      <div style={{ ...S.analysisSectionHeader, borderLeft: `4px solid ${sec.color}` }}>
        <h4 style={S.analysisSectionTitle}>{sec.title}</h4>
      </div>

      <div style={S.chipWrap}>
        {sec.data.map((item, j) => (
          <span key={j} style={S.analysisChip}>
            {item}
          </span>
        ))}
      </div>

    </div>
  ))}
</div>


                  {analysis.suggestions && (
                    <>
                      <h3 style={{ ...S.analysisSectionTitle, fontSize: 16, marginTop: 20 }}>📈 Improvement Suggestions</h3>
                      {[
                        { title: "🔧 Core Skills", data: analysis.suggestions.core_skill_improvement },
                        { title: "🧠 Soft Skills", data: analysis.suggestions.soft_skill_improvement },
                        { title: "🛠 Project Ideas", data: analysis.suggestions.project_suggestions },
                      ].map((sec, i) => sec.data?.length > 0 && (
                        <div key={i} style={S.analysisSection}>
                          <h4 style={S.analysisSectionTitle}>{sec.title}</h4>
                          <ul style={S.analysisList}>
                            {sec.data.map((item, j) => <li key={j} style={S.analysisListItem}>{item}</li>)}
                          </ul>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ===== UPLOAD MODAL ===== */}
      {showUploadModal && (
        <div style={S.overlay} onClick={() => setShowUploadModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>📤 Upload Resume</h3>
            <p style={S.modalDesc}>Select a PDF, DOC, or DOCX file</p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={S.fileInput}
            />
            {selectedFile && <p style={{ fontSize: 13, color: "#059669", marginTop: 8 }}>📎 {selectedFile.name}</p>}
            {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>❌ {error}</p>}
            <div style={S.modalActions}>
              <button style={S.modalUploadBtn} onClick={handleUpload}>Upload</button>
              <button style={S.modalCancelBtn} onClick={() => setShowUploadModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================ STYLES ============================================ */
const S = {
  shell: { display: "flex", width: "100%", minHeight: "100vh", background: "#f1f5f9" },

  // Sidebar
  sidebar: { width: 260, background: "linear-gradient(180deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, boxSizing: "border-box", padding: "24px 16px 20px" },
  sideTop: {},
  sideBottom: { borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 },
  logoWrap: { display: "flex", alignItems: "center", gap: 12, padding: "0 8px", marginBottom: 32 },
  logoBox: { width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#818cf8,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 },
  logoTitle: { fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" },
  logoSub: { fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: -1 },
  nav: { display: "flex", flexDirection: "column", gap: 2 },
  navBtn: { display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", background: "transparent", color: "#94a3b8", borderRadius: 10, fontSize: 13, fontWeight: 500, textAlign: "left", transition: "all .15s", width: "100%", position: "relative" },
  navActive: { display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", background: "rgba(99,102,241,.15)", color: "#a5b4fc", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%", position: "relative" },
  navIcon: { fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 },
  countBadge: { marginLeft: "auto", background: "#6366f1", color: "#fff", padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: "center" },
  countBadgeGreen: { marginLeft: "auto", background: "#059669", color: "#fff", padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: "center" },
  userBox: { display: "flex", alignItems: "center", gap: 10, padding: "8px", marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 },
  userInfo: { overflow: "hidden" },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userId: { fontSize: 11, color: "#64748b" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "rgba(239,68,68,.1)", color: "#fca5a5", borderRadius: 10, fontSize: 13, fontWeight: 600 },

  // Main
  main: { flex: 1, marginLeft: 260, padding: "32px 40px 48px", minHeight: "100vh" },

  // Header
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 },
  nameHL: { color: "#6366f1" },
  pageSub: { fontSize: 14, color: "#64748b", margin: "6px 0 0" },
  dateBadge: { background: "#fff", color: "#475569", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid #e2e8f0" },

  // Stats
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 32 },
  statCard: { background: "#fff", borderRadius: 16, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)" },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  statValue: { fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 3 },
  skelCard: { height: 90, background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", borderRadius: 16, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },

  // Section Title
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" },

  // Quick Actions
  qaGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 8 },
  qaCard: { background: "#fff", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0", cursor: "pointer", textAlign: "left", transition: "all .2s", boxShadow: "0 1px 3px rgba(0,0,0,.04)", width: "100%" },
  qaIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", flexShrink: 0 },
  qaTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 },
  qaDesc: { fontSize: 11, color: "#94a3b8", fontWeight: 400 },
  qaArrow: { marginLeft: "auto", color: "#cbd5e1", fontSize: 16, fontWeight: 600 },

  // Card List
  cardList: { display: "flex", flexDirection: "column", gap: 14 },

  // Assignment Card
  aCard: { background: "#fff", borderRadius: 16, padding: "22px 26px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.03)", transition: "all .2s" },
  aCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  aCardMeta: { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 },
  typeScenario: { background: "#f3e8ff", color: "#7c3aed", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 },
  typeQuestion: { background: "#dbeafe", color: "#2563eb", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 },
  aId: { color: "#94a3b8", fontSize: 12, fontWeight: 500 },
  urgentBadge: { background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600 },
  aSubject: { fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 },
  statusDone: { background: "#ecfdf5", color: "#059669", padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  statusPending: { background: "#fffbeb", color: "#d97706", padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 },
  aDetails: { display: "flex", gap: 32, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" },
  aDetail: { display: "flex", flexDirection: "column", gap: 2 },
  aDetailLabel: { fontSize: 11, color: "#94a3b8", fontWeight: 500 },
  aDetailVal: { fontSize: 14, fontWeight: 600, color: "#334155" },
  aCardBottom: {},
  startBtn: { padding: "10px 24px", borderRadius: 10, fontWeight: 600, fontSize: 13, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.08)", transition: "all .15s" },
  evalRow: { display: "flex", alignItems: "center", gap: 12 },
  evalBtn: { padding: "10px 22px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 13, border: "none", boxShadow: "0 2px 8px rgba(99,102,241,.2)", cursor: "pointer" },
  statusSmall: { fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "capitalize" },

  // Empty
  emptyState: { textAlign: "center", padding: "72px 0" },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#334155", margin: "0 0 6px" },
  emptyDesc: { fontSize: 14, color: "#94a3b8" },

  // Resume
  resumeCard: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "40px", marginBottom: 24 },
  resumeUploadArea: { textAlign: "center" },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  uploadDesc: { fontSize: 13, color: "#94a3b8", marginBottom: 20 },
  uploadBtn: { padding: "12px 28px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 12px rgba(99,102,241,.25)" },
  uploadSuccess: { marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  analyzeBtn: { padding: "10px 24px", background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 10px rgba(5,150,105,.2)" },

  analysisCard: {
  background: "rgba(255,255,255,0.9)",
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  padding: "32px",
  marginBottom: 20,
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  backdropFilter: "blur(10px)"
},

analysisTitle: {
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 24,
  letterSpacing: "-0.3px"
},

analysisGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginBottom: 28
},

analysisStat: {
  background: "#f8fafc",
  borderRadius: 14,
  padding: "18px 20px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column"
},

analysisStatLabel: {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 500,
  marginBottom: 6
},

analysisStatValue: {
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a"
},

analysisSections: {
  display: "grid",
  gap: 16
},

// 🔥 NEW CARD STYLE
analysisSectionCard: {
  background: "#ffffff",
  borderRadius: 16,
  padding: "16px 18px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
  transition: "all 0.2s ease"
},

analysisSectionHeader: {
  marginBottom: 10,
  paddingLeft: 10
},

analysisSectionTitle: {
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a"
},

chipWrap: {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
},

// 🔥 UPGRADED CHIP
analysisChip: {
  background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
  color: "#1e293b",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid #e2e8f0",
  transition: "all 0.2s ease",
  cursor: "default"
},

analysisList: {
  margin: "0 0 0 18px",
  padding: 0
},

analysisListItem: {
  fontSize: 13,
  color: "#475569",
  lineHeight: 1.8
},

skelLine: {
  height: 14,
  background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
  borderRadius: 6,
  marginBottom: 10,
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite"
},
  analysisChip: { background: "#f1f5f9", color: "#334155", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid #e2e8f0" },
  analysisList: { margin: "0 0 0 18px", padding: 0 },
  analysisListItem: { fontSize: 13, color: "#475569", lineHeight: 1.8 },
  skelLine: { height: 14, background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", borderRadius: 6, marginBottom: 10, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },

  // Modal
  overlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(15,23,42,.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200, backdropFilter: "blur(4px)" },
  modal: { background: "#fff", borderRadius: 20, padding: "32px", width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,.15)" },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  modalDesc: { fontSize: 13, color: "#64748b", marginBottom: 20 },
  fileInput: { width: "100%", padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#f8fafc", boxSizing: "border-box" },
  modalActions: { display: "flex", gap: 10, marginTop: 20 },
  modalUploadBtn: { padding: "10px 24px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  modalCancelBtn: { padding: "10px 20px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" },
};

export default StudentDashboard;
